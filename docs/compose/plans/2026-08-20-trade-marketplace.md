# Trade — Buy & Sell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full marketplace feature — list, browse, buy, cancel card trades with on-chain ownership transfer, FVM pricing, AI market insights, and seed data for demo.

**Architecture:** Smart contract gets a new `marketplaceTransfer()` owner-only function for verified Digital card transfers. Backend manages `listings` MongoDB collection with credit-based payments (8% fee). AI insights powered by Gemini API with 1-hour cache. All on-chain ops follow existing async pattern (ADR-018).

**Tech Stack:** Solidity 0.8.24 + Foundry (tests), Next.js API routes, MongoDB, ethers.js v6, @google/generative-ai (Gemini), Tailwind CSS v4.

## Global Constraints

- Custodial wallets — users never see addresses (ADR-002)
- Platform-sponsored gas — admin wallet signs all tx (ADR-003)
- Vaulted cards cannot be transferred on-chain (ADR-004, `_update()` override)
- Async tx pattern: return pending immediately, frontend polls status (ADR-018)
- Next.js API routes as sole backend (ADR-017)
- Credit prices in cents (integer), displayed with "Credit" suffix
- Marketplace fee: 8% (seller receives `price * 0.92`)
- Card can only be listed if: `status === "Digital"` AND `isListed === false` AND `fulfillmentStatus === null`
- While `isListed === true`: print is blocked (guard in UI + API)
- FVM floor: `FVM * 0.7` if FVM exists, no floor if no FVM data
- `GEMINI_API_KEY` available in `.env.local`
- Supersedes ADR-010 (marketplace "Coming Soon" → functional)

---

### Task 1: Write Failing Tests for marketplaceTransfer

**Covers:** S1 (smart contract marketplaceTransfer function)

**Files:**
- Modify: `contracts/test/GachardCard.t.sol`

**Interfaces:**
- Consumes: existing `GachardCard` contract with `mintCard`, `cardStatus`, `lastOwner`, `balanceOf`
- Produces: test expectations for `marketplaceTransfer(uint256, address, address)`

- [ ] **Step 1: Add marketplaceTransfer test section to GachardCard.t.sol**

Append after the existing "Full loop tests" section (after line 361):

```solidity
    // ==================== marketplaceTransfer tests ====================

    function test_marketplaceTransfer_moves_token_to_buyer() public {
        uint256 tokenId = card.mintCard(user1, 0); // Common, Digital

        card.marketplaceTransfer(tokenId, user1, user2);

        assertEq(card.balanceOf(user1, tokenId), 0);
        assertEq(card.balanceOf(user2, tokenId), 1);
    }

    function test_marketplaceTransfer_updates_last_owner() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.marketplaceTransfer(tokenId, user1, user2);

        assertEq(card.lastOwner(tokenId), user2);
    }

    function test_marketplaceTransfer_keeps_digital_status() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.marketplaceTransfer(tokenId, user1, user2);

        assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));
    }

    function test_marketplaceTransfer_emits_event() public {
        uint256 tokenId = card.mintCard(user1, 0);

        vm.expectEmit(true, true, false, true);
        emit GachardCard.MarketplaceTransfer(tokenId, user1, user2);
        card.marketplaceTransfer(tokenId, user1, user2);
    }

    function test_marketplaceTransfer_reverts_when_vaulted() public {
        uint256 tokenId = card.mintCard(user1, 0);
        bytes32 hash = keccak256("code");
        card.requestPrint(tokenId, hash, user1);

        vm.expectRevert("Card is not digital");
        card.marketplaceTransfer(tokenId, user1, user2);
    }

    function test_marketplaceTransfer_reverts_when_not_owner() public {
        uint256 tokenId = card.mintCard(user1, 0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        card.marketplaceTransfer(tokenId, user1, user2);
    }

    function test_marketplaceTransfer_reverts_when_from_not_holder() public {
        uint256 tokenId = card.mintCard(user1, 0);
        // user2 doesn't hold the token — from address must match holder
        vm.expectRevert("Sender does not own card");
        card.marketplaceTransfer(tokenId, user2, user1);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `contracts/` directory, using Git Bash on Windows):
```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && forge test --match-test test_marketplaceTransfer -vvv 2>&1"
```

Expected: All 7 tests FAIL with compilation error — `marketplaceTransfer` function does not exist yet, `MarketplaceTransfer` event not defined.

- [ ] **Step 3: Commit failing tests**

```bash
git add contracts/test/GachardCard.t.sol
git commit -m "test: add failing tests for marketplaceTransfer function"
```

---

### Task 2: Implement marketplaceTransfer + Pass Tests

**Covers:** S1, S2 (smart contract function + test pass)

**Files:**
- Modify: `contracts/src/GachardCard.sol`

**Interfaces:**
- Consumes: `cardStatus` mapping, `lastOwner` mapping, `_update()` override, `Ownable`
- Produces: `marketplaceTransfer(uint256 tokenId, address from, address to)` — owner-only, reverts if not Digital, transfers NFT, updates lastOwner

- [ ] **Step 1: Add MarketplaceTransfer event to GachardCard.sol**

After line 26 (`event CardStatusChanged...`), add:

```solidity
    event MarketplaceTransfer(uint256 indexed tokenId, address indexed from, address indexed to);
```

- [ ] **Step 2: Add marketplaceTransfer function**

After the `redeemCard` function (after line 129), add:

```solidity
    /**
     * @notice Transfer kartu antar user via marketplace — hanya untuk kartu Digital
     * @dev onlyOwner — backend yang memanggil (ADR-003, custodial model)
     * @dev Revert jika kartu Vaulted (sudah di-block oleh _update, tapi kita cek eksplisit)
     * @param tokenId ID kartu yang ditransfer
     * @param from Alamat penjual (harus pemilik kartu saat ini)
     * @param to Alamat pembeli
     */
    function marketplaceTransfer(uint256 tokenId, address from, address to) external onlyOwner {
        require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
        require(balanceOf(from, tokenId) == 1, "Sender does not own card");

        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        uint256[] memory values = new uint256[](1);
        values[0] = 1;
        _update(from, to, ids, values);

        lastOwner[tokenId] = to;

        emit MarketplaceTransfer(tokenId, from, to);
    }
```

- [ ] **Step 3: Run all tests to verify everything passes**

Run:
```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && forge test -vvv 2>&1"
```

Expected: ALL tests pass (existing 29 + new 7 = 36 total).

- [ ] **Step 4: Commit**

```bash
git add contracts/src/GachardCard.sol
git commit -m "feat: add marketplaceTransfer function to GachardCard contract"
```

---

### Task 3: Deploy Updated Contract

**Covers:** S3 (redeploy after tests pass)

**Files:**
- Modify: `contracts/src/GachardCard.sol` (already done in Task 2)
- Modify: `frontend/.env.local` — update `CONTRACT_ADDRESS`
- Create: new deployment on BNB Testnet

**Interfaces:**
- Consumes: updated `GachardCard.sol` with `marketplaceTransfer`
- Produces: new contract address, updated env vars

- [ ] **Step 1: Verify all Foundry tests pass one final time**

```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && forge test 2>&1"
```

Expected: 36/36 pass.

- [ ] **Step 2: Deploy to BNB Testnet**

```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast --verify 2>&1"
```

Save the new contract address from output.

- [ ] **Step 3: Update CONTRACT_ADDRESS in env files**

Update `CONTRACT_ADDRESS` in:
- `frontend/.env.local`
- Vercel Production environment variables

- [ ] **Step 4: Verify deployment with MintTest script**

```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && CONTRACT_ADDRESS=<new_address> ADMIN_WALLET_ADDRESS=0xF7DEd49EB412F69520c38C3f7e36523d71428DEa forge script script/MintTest.s.sol --rpc-url bsc_testnet --broadcast 2>&1"
```

- [ ] **Step 5: Commit and push**

```bash
git add contracts/src/GachardCard.sol
git commit -m "chore: redeploy GachardCard with marketplaceTransfer"
git push
```

---

### Task 4: Data Model — listings Collection + Cards Schema Update

**Covers:** S4, S5 (listings collection, cards.isListed/cards.listingId)

**Files:**
- Create: `frontend/lib/listings.ts` — MongoDB operations for listings collection
- Modify: `frontend/app/api/cards/route.ts` — include isListed in response

**Interfaces:**
- Consumes: `getCollection` from `lib/mongodb.ts`, existing `cards` collection schema
- Produces: `listings` collection with schema `{ listingId, cardId, templateId, sellerId, sellerWalletAddress, price, status, createdAt, soldAt, buyerId }`

- [ ] **Step 1: Create frontend/lib/listings.ts**

```typescript
import { getCollection } from "./mongodb";
import { ObjectId } from "mongodb";

export interface Listing {
  _id?: ObjectId;
  listingId: string;
  cardId: string;
  tokenId: number;
  templateId: string;
  sellerId: string;
  sellerWalletAddress: string;
  price: number; // integer Credit (cents)
  status: "active" | "sold" | "cancelled";
  createdAt: string;
  soldAt?: string;
  buyerId?: string;
}

/**
 * Create a new listing. Returns the inserted listing document.
 */
export async function createListing(data: {
  cardId: string;
  tokenId: number;
  templateId: string;
  sellerId: string;
  sellerWalletAddress: string;
  price: number;
}): Promise<Listing> {
  const collection = await getCollection("listings");
  const listingId = `LS-${Date.now().toString(36).toUpperCase()}`;
  const doc: Listing = {
    listingId,
    cardId: data.cardId,
    tokenId: data.tokenId,
    templateId: data.templateId,
    sellerId: data.sellerId,
    sellerWalletAddress: data.sellerWalletAddress,
    price: data.price,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await collection.insertOne(doc);
  return doc;
}

/**
 * Get active listings, optionally filtered. Populates card artwork from card_templates.
 */
export async function getActiveListings(filter?: { templateId?: string }): Promise<Listing[]> {
  const collection = await getCollection("listings");
  const query: Record<string, unknown> = { status: "active" };
  if (filter?.templateId) query.templateId = filter.templateId;
  return collection.find(query).sort({ createdAt: -1 }).toArray() as Promise<Listing[]>;
}

/**
 * Get a single listing by listingId.
 */
export async function getListingById(listingId: string): Promise<Listing | null> {
  const collection = await getCollection("listings");
  return collection.findOne({ listingId }) as Promise<Listing | null>;
}

/**
 * Cancel a listing (set status to "cancelled").
 */
export async function cancelListing(listingId: string, sellerId: string): Promise<boolean> {
  const collection = await getCollection("listings");
  const result = await collection.updateOne(
    { listingId, sellerId, status: "active" },
    { $set: { status: "cancelled", updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount === 1;
}

/**
 * Mark listing as sold. Atomic — only if still active.
 */
export async function markListingSold(
  listingId: string,
  buyerId: string
): Promise<Listing | null> {
  const collection = await getCollection("listings");
  const result = await collection.findOneAndUpdate(
    { listingId, status: "active" },
    {
      $set: {
        status: "sold",
        buyerId,
        soldAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after" }
  );
  return result as Listing | null;
}
```

- [ ] **Step 2: Update cards API to include isListed field**

In `frontend/app/api/cards/route.ts`, when building the response for each card, add `isListed` and `listingId` fields from the card document. The card document already has these fields (we'll add them in the listing API); the cards API just needs to pass them through.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/listings.ts
git commit -m "feat: add listings data model and MongoDB operations"
```

---

### Task 5: FVM (Fair Value Market) Calculation Library

**Covers:** S11 (FVM calculation function)

**Files:**
- Create: `frontend/lib/fvm.ts`

**Interfaces:**
- Consumes: `transactions` collection (type: "sold"), `card_templates` collection (rarity)
- Produces: `getFVM(templateId)` → `{ fvm: number | null, source: "template" | "rarity" | "none" }`

- [ ] **Step 1: Create frontend/lib/fvm.ts**

```typescript
import { getCollection } from "./mongodb";

export interface FVMResult {
  fvm: number | null; // average price in cents, null if no data
  source: "template" | "rarity" | "none";
}

/**
 * Calculate Fair Value Market for a template.
 * 1. Average of all "sold" transactions for this templateId
 * 2. Fallback: average of all "sold" with same rarity
 * 3. Fallback: null (no data)
 */
export async function getFVM(templateId: string): Promise<FVMResult> {
  const txCollection = await getCollection("transactions");

  // Level 1: same templateId
  const templateSold = await txCollection
    .find({ type: "sold", templateId, status: "confirmed" })
    .toArray();

  if (templateSold.length > 0) {
    const avg =
      templateSold.reduce((sum, tx) => sum + (tx.amount || 0), 0) /
      templateSold.length;
    return { fvm: Math.round(avg), source: "template" };
  }

  // Level 2: same rarity
  const templatesCollection = await getCollection("card_templates");
  const template = await templatesCollection.findOne({ templateId });
  if (!template) return { fvm: null, source: "none" };

  const raritySold = await txCollection
    .find({ type: "sold", rarity: template.rarity, status: "confirmed" })
    .toArray();

  if (raritySold.length > 0) {
    const avg =
      raritySold.reduce((sum, tx) => sum + (tx.amount || 0), 0) /
      raritySold.length;
    return { fvm: Math.round(avg), source: "rarity" };
  }

  // Level 3: no data
  return { fvm: null, source: "none" };
}

/**
 * Calculate FVM floor price (70% of FVM).
 * Returns null if FVM is null.
 */
export function getFVMFloor(fvm: number | null): number | null {
  if (fvm === null) return null;
  return Math.round(fvm * 0.7);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/fvm.ts
git commit -m "feat: add FVM (Fair Value Market) calculation library"
```

---

### Task 6: Seed Data Script — Dummy Sold Transactions

**Covers:** S13 (seed data with ownership chains)

**Files:**
- Create: `frontend/scripts/seed-marketplace.ts`

**Interfaces:**
- Consumes: existing `users`, `cards`, `transactions`, `card_templates` collections
- Produces: ~25 dummy "sold" transactions with realistic price distribution and 2-3 ownership chains

- [ ] **Step 1: Create seed script**

```typescript
/**
 * Seed marketplace demo data — dummy "sold" transactions for FVM and Trade page demo.
 * Run: cd frontend && npx tsx scripts/seed-marketplace.ts
 *
 * IMPORTANT: Uses existing demo users only. Does NOT create new users.
 * Creates ownership chains on specific cards (A→B→C→D) for demo richness.
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URL = process.env.MONGODB_URL || "";

// Rarity price ranges (in cents/Credit)
const PRICE_RANGES = {
  0: { min: 50, max: 150, count: [6, 7] },   // Common
  1: { min: 200, max: 500, count: [5, 6] },   // Rare
  2: { min: 600, max: 1200, count: [3, 4] },  // Epic
  3: { min: 1500, max: 3000, count: [2, 3] }, // Legendary
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min: number, max: number) {
  // Round to nearest 10 for realistic pricing
  return Math.round(randomInt(min, max) / 10) * 10;
}

function pastDate(daysAgo: number, jitterDays = 3) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo + randomInt(-jitterDays, jitterDays));
  d.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString();
}

async function seed() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db();

  const usersCol = db.collection("users");
  const cardsCol = db.collection("cards");
  const txCol = db.collection("transactions");
  const templatesCol = db.collection("card_templates");

  // Get existing demo users
  const users = await usersCol.find({}).toArray();
  if (users.length < 6) {
    console.error("Need at least 6 demo users. Found:", users.length);
    process.exit(1);
  }
  console.log(`Found ${users.length} users`);

  // Get existing cards (Digital status, not listed)
  const cards = await cardsCol
    .find({ status: "Digital" })
    .sort({ tokenId: 1 })
    .toArray();
  if (cards.length < 10) {
    console.error("Need at least 10 Digital cards. Found:", cards.length);
    process.exit(1);
  }
  console.log(`Found ${cards.length} Digital cards`);

  // Get templates for rarity info
  const templates = await templatesCol.find({}).toArray();
  const templateRarityMap = new Map(templates.map((t) => [t.templateId, t.rarity]));

  // Clear existing sold transactions
  const deleteResult = await txCol.deleteMany({ type: "sold" });
  console.log(`Deleted ${deleteResult.deletedCount} existing sold transactions`);

  const transactions: any[] = [];
  let txTimestamp = 21; // days ago, will count down

  // === OWNERSHIP CHAINS (3 cards with multiple trades) ===
  // Pick 3 specific cards for chains (prefer higher rarity for demo)
  const cardsByRarity = new Map<number, typeof cards>();
  for (const card of cards) {
    const r = card.rarity ?? 0;
    if (!cardsByRarity.has(r)) cardsByRarity.set(r, []);
    cardsByRarity.get(r)!.push(card);
  }

  // Chain 1: Legendary card — 5 trades
  const chain1Card = cardsByRarity.get(3)?.[0] || cardsByRarity.get(2)?.[0] || cards[0];
  // Chain 2: Epic card — 4 trades
  const chain2Card = cardsByRarity.get(2)?.[0] || cardsByRarity.get(1)?.[0] || cards[1];
  // Chain 3: Rare card — 3 trades
  const chain3Card = cardsByRarity.get(1)?.[0] || cards[2];

  const chainConfigs = [
    { card: chain1Card, trades: 5, basePrice: chain1Card.rarity === 3 ? 2000 : 800, variance: 300 },
    { card: chain2Card, trades: 4, basePrice: chain2Card.rarity === 2 ? 900 : 400, variance: 200 },
    { card: chain3Card, trades: 3, basePrice: chain3Card.rarity === 1 ? 350 : 100, variance: 100 },
  ];

  for (const chain of chainConfigs) {
    const chainUsers = users.slice(0, chain.trades + 1);
    let price = chain.basePrice;

    for (let i = 0; i < chain.trades; i++) {
      // Price fluctuates realistically (±variance)
      price = Math.max(
        50,
        price + randomInt(-chain.variance, chain.variance)
      );
      price = Math.round(price / 10) * 10;

      const rarity = chain.card.rarity ?? 0;
      const templateId = chain.card.templateId;
      const daysBack = txTimestamp - i * 2;
      const fromUser = chainUsers[i];
      const toUser = chainUsers[i + 1];

      transactions.push({
        _id: new ObjectId(),
        userId: toUser._id.toString(),
        type: "sold",
        tokenId: chain.card.tokenId,
        tokenIds: [chain.card.tokenId],
        rarity,
        rarities: [rarity],
        templateIds: [templateId],
        amount: price,
        purchasePrice: price,
        txHash: null,
        status: "confirmed",
        contractAddress: process.env.CONTRACT_ADDRESS || "",
        fromAddress: fromUser.walletAddress || "0x0000000000000000000000000000000000000000",
        toAddress: toUser.walletAddress || "0x0000000000000000000000000000000000000000",
        error: "",
        createdAt: pastDate(daysBack),
        updatedAt: pastDate(daysBack),
      });
    }
    console.log(`Chain: ${chain.card.cardId} (${["Common","Rare","Epic","Legendary"][chain.card.rarity??0]}) — ${chain.trades} trades`);
  }

  // === INDEPENDENT SOLD TRANSACTIONS (fill up per rarity) ===
  const usedCardIds = new Set(chainConfigs.map((c) => c.card.cardId));

  for (const [rarityStr, config] of Object.entries(PRICE_RANGES)) {
    const rarity = parseInt(rarityStr);
    const count = randomInt(config.count[0], config.count[1]);
    const rarityCards = cards.filter(
      (c) => (c.rarity ?? 0) === rarity && !usedCardIds.has(c.cardId)
    );

    for (let i = 0; i < count && i < rarityCards.length; i++) {
      const card = rarityCards[i];
      usedCardIds.add(card.cardId);
      const price = randomPrice(config.min, config.max);
      const sellerIdx = randomInt(0, users.length - 1);
      let buyerIdx = randomInt(0, users.length - 1);
      while (buyerIdx === sellerIdx) buyerIdx = randomInt(0, users.length - 1);

      const seller = users[sellerIdx];
      const buyer = users[buyerIdx];

      transactions.push({
        _id: new ObjectId(),
        userId: buyer._id.toString(),
        type: "sold",
        tokenId: card.tokenId,
        tokenIds: [card.tokenId],
        rarity,
        rarities: [rarity],
        templateIds: [card.templateId],
        amount: price,
        purchasePrice: price,
        txHash: null,
        status: "confirmed",
        contractAddress: process.env.CONTRACT_ADDRESS || "",
        fromAddress: seller.walletAddress || "0x0000000000000000000000000000000000000000",
        toAddress: buyer.walletAddress || "0x0000000000000000000000000000000000000000",
        error: "",
        createdAt: pastDate(txTimestamp - i * 3),
        updatedAt: pastDate(txTimestamp - i * 3),
      });
    }
    console.log(`Independent: ${count} ${["Common","Rare","Epic","Legendary"][rarity]} transactions`);
  }

  // Insert all
  if (transactions.length > 0) {
    await txCol.insertMany(transactions);
  }

  // Update cards used in ownership chains to match final owner
  for (const chain of chainConfigs) {
    const chainUsers = users.slice(0, chain.trades + 1);
    const finalOwner = chainUsers[chain.trades]; // last buyer in chain
    await cardsCol.updateOne(
      { cardId: chain.card.cardId },
      {
        $set: {
          ownerAddress: finalOwner.walletAddress || "",
          lastOwner: finalOwner.walletAddress || "",
          updatedAt: new Date().toISOString(),
        },
      }
    );
    console.log(`Updated card ${chain.card.cardId} owner to ${finalOwner.username || finalOwner._id}`);
  }

  console.log(`\nSeeded ${transactions.length} sold transactions total`);
  await client.close();
}

seed().catch(console.error);
```

- [ ] **Step 2: Run seed script**

```bash
cd frontend && npx tsx scripts/seed-marketplace.ts
```

Expected: Output shows chain details + independent transaction counts, total ~25 transactions.

- [ ] **Step 3: Commit**

```bash
git add frontend/scripts/seed-marketplace.ts
git commit -m "feat: add marketplace seed data script with ownership chains"
```

---

### Task 7: AI Market Insight + Price Suggestion Library

**Covers:** S21, S22 (AI market insight, price suggestion)

**Files:**
- Create: `frontend/lib/market-insight.ts`

**Interfaces:**
- Consumes: `transactions` collection (type: "sold"), `GEMINI_API_KEY` env, `getFVM()` from `lib/fvm.ts`
- Produces: `generateMarketInsight()` → cached insight text, `suggestListingPrice(templateId)` → price suggestion text

- [ ] **Step 1: Create frontend/lib/market-insight.ts**

```typescript
import { getCollection } from "./mongodb";
import { getFVM } from "./fvm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface MarketInsightCache {
  _id?: string;
  insight: string;
  generatedAt: string;
  expiresAt: string;
}

/**
 * Generate market insight using Gemini LLM.
 * Cached in `market_insights` collection for 1 hour.
 */
export async function generateMarketInsight(): Promise<string> {
  const collection = await getCollection("market_insights");

  // Check cache
  const cached = await collection.findOne({
    expiresAt: { $gt: new Date().toISOString() },
  });
  if (cached) return cached.insight;

  // Gather data: sold transactions from last 2 weeks
  const txCol = await getCollection("transactions");
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const recentSold = await txCol
    .find({ type: "sold", status: "confirmed", createdAt: { $gte: twoWeeksAgo } })
    .toArray();

  const previousSold = await txCol
    .find({ type: "sold", status: "confirmed", createdAt: { $gte: fourWeeksAgo, $lt: twoWeeksAgo } })
    .toArray();

  // Group by rarity
  const rarityNames = ["Common", "Rare", "Epic", "Legendary"];
  const statsByRarity: Record<string, { recent: number[]; previous: number[] }> = {};
  for (let r = 0; r < 4; r++) {
    statsByRarity[rarityNames[r]] = {
      recent: recentSold.filter((tx) => tx.rarity === r).map((tx) => tx.amount || 0),
      previous: previousSold.filter((tx) => tx.rarity === r).map((tx) => tx.amount || 0),
    };
  }

  // Build summary for LLM
  let dataSummary = "Data tren harga 2 minggu terakhir (dalam Credit):\n";
  for (const [rarity, data] of Object.entries(statsByRarity)) {
    const recentAvg = data.recent.length > 0
      ? Math.round(data.recent.reduce((a, b) => a + b, 0) / data.recent.length)
      : null;
    const prevAvg = data.previous.length > 0
      ? Math.round(data.previous.reduce((a, b) => a + b, 0) / data.previous.length)
      : null;
    const change = recentAvg && prevAvg ? ((recentAvg - prevAvg) / prevAvg * 100).toFixed(1) : "N/A";
    dataSummary += `- ${rarity}: ${data.recent.length} transaksi, rata-rata ${recentAvg ?? "–"} Credit, perubahan ${change}%\n`;
  }

  // Call Gemini
  const insight = await callGemini(
    `Berdasarkan data tren harga kartu collectible berikut, tulis ringkasan 2-3 kalimat dalam bahasa Indonesia yang insightful untuk kolektor kartu. Sebutkan rarity mana yang paling bergerak dan kemungkinan alasannya (kelangkaan, demand, tren pasar). Gunakan nada profesional dan menarik.\n\n${dataSummary}`
  );

  // Cache
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS).toISOString();
  await collection.deleteMany({});
  await collection.insertOne({
    insight,
    generatedAt: now.toISOString(),
    expiresAt,
  });

  return insight;
}

/**
 * Suggest listing price for a specific template using FVM + market trend + LLM.
 * Returns null if no FVM data exists for this template.
 */
export async function suggestListingPrice(templateId: string): Promise<string | null> {
  const fvmResult = await getFVM(templateId);
  if (fvmResult.fvm === null) return null;

  // Get rarity trend data
  const templatesCol = await getCollection("card_templates");
  const template = await templatesCol.findOne({ templateId });
  if (!template) return null;

  const txCol = await getCollection("transactions");
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const recentSold = await txCol
    .find({ type: "sold", rarity: template.rarity, status: "confirmed", createdAt: { $gte: twoWeeksAgo } })
    .toArray();
  const previousSold = await txCol
    .find({ type: "sold", rarity: template.rarity, status: "confirmed", createdAt: { $gte: fourWeeksAgo, $lt: twoWeeksAgo } })
    .toArray();

  const recentAvg = recentSold.length > 0
    ? Math.round(recentSold.reduce((s, tx) => s + (tx.amount || 0), 0) / recentSold.length)
    : fvmResult.fvm;
  const prevAvg = previousSold.length > 0
    ? Math.round(previousSold.reduce((s, tx) => s + (tx.amount || 0), 0) / previousSold.length)
    : fvmResult.fvm;

  const trendPct = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg * 100).toFixed(1) : "0";
  const trendDirection = parseFloat(trendPct) > 5 ? "naik" : parseFloat(trendPct) < -5 ? "turun" : "stabil";

  const rarityName = ["Common", "Rare", "Epic", "Legendary"][template.rarity];
  const floor = Math.round(fvmResult.fvm * 0.7);

  const prompt = `Kartu ini rarity ${rarityName}, nilai pasar rata-rata ${fvmResult.fvm} Credit, tren harga rarity ini sedang ${trendDirection} (${trendPct}%). Harga minimum yang diizinkan sistem: ${floor} Credit.

Berikan rekomendasi range harga listing yang wajar dalam 1-2 kalimat bahasa Indonesia, actionable untuk penjual. Sebutkan angka spesifik. Jangan gunakan format markdown.`;

  return callGemini(prompt);
}

/**
 * Call Gemini API with a prompt. Returns generated text.
 */
async function callGemini(prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/market-insight.ts
git commit -m "feat: add AI market insight and price suggestion library using Gemini"
```

---

### Task 8: API — POST /api/marketplace/listings (Create Listing)

**Covers:** S7, S8, S10, S14 (listing validation, print guard, FVM floor, create endpoint)

**Files:**
- Create: `frontend/app/api/marketplace/listings/route.ts`

**Interfaces:**
- Consumes: `createListing()` from `lib/listings.ts`, `getFVM()`/`getFVMFloor()` from `lib/fvm.ts`, `getCollection` from `lib/mongodb.ts`
- Produces: `{ listing }` on success, `{ error }` on failure

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { createListing } from "@/lib/listings";
import { getFVM, getFVMFloor } from "@/lib/fvm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, cardId, price } = body;

    if (!userId || !cardId || typeof price !== "number") {
      return NextResponse.json({ error: "Missing required fields: userId, cardId, price" }, { status: 400 });
    }

    if (price <= 0 || !Number.isInteger(price)) {
      return NextResponse.json({ error: "Price must be a positive integer" }, { status: 400 });
    }

    // Get card
    const cardsCol = await getCollection("cards");
    const card = await cardsCol.findOne({ cardId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Verify ownership
    const usersCol = await getCollection("users");
    const user = await usersCol.findOne({ _id: parseObjectId(userId) });
    if (!user || user.walletAddress !== card.ownerAddress) {
      return NextResponse.json({ error: "You do not own this card" }, { status: 403 });
    }

    // Check card status: must be Digital
    if (card.status !== "Digital") {
      return NextResponse.json({ error: "Card must be Digital to list" }, { status: 400 });
    }

    // Check not already listed
    if (card.isListed) {
      return NextResponse.json({ error: "Card is already listed" }, { status: 400 });
    }

    // Check not in fulfillment (never printed or in print process)
    if (card.fulfillmentStatus) {
      return NextResponse.json({ error: "Card with physical print history cannot be listed" }, { status: 400 });
    }

    // FVM floor check
    const fvmResult = await getFVM(card.templateId);
    const floor = getFVMFloor(fvmResult.fvm);
    if (floor !== null && price < floor) {
      return NextResponse.json({
        error: `Price below FVM floor. Minimum: ${floor} Credit (70% of FVM ${fvmResult.fvm})`,
        floor,
        fvm: fvmResult.fvm,
      }, { status: 400 });
    }

    // Create listing
    const listing = await createListing({
      cardId: card.cardId,
      tokenId: card.tokenId,
      templateId: card.templateId,
      sellerId: userId,
      sellerWalletAddress: user.walletAddress,
      price,
    });

    // Mark card as listed
    await cardsCol.updateOne(
      { cardId },
      { $set: { isListed: true, listingId: listing.listingId } }
    );

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("[marketplace/listings POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/marketplace/listings/route.ts
git commit -m "feat: POST /api/marketplace/listings — create listing with FVM floor validation"
```

---

### Task 9: API — GET /api/marketplace/listings (Browse) + GET /api/marketplace/fvm

**Covers:** S15, S18 (browse listings, FVM endpoint)

**Files:**
- Modify: `frontend/app/api/marketplace/listings/route.ts` — add GET handler
- Create: `frontend/app/api/marketplace/fvm/route.ts`

- [ ] **Step 1: Add GET handler to listings route**

Append to `frontend/app/api/marketplace/listings/route.ts`:

```typescript
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId") || undefined;

    const listingsCol = await getCollection("listings");
    const query: Record<string, unknown> = { status: "active" };
    if (templateId) query.templateId = templateId;

    const listings = await listingsCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with artwork + FVM
    const templatesCol = await getCollection("card_templates");
    const templates = await templatesCol.find({}).toArray();
    const templateMap = new Map(templates.map((t) => [t.templateId, t]));

    const enriched = await Promise.all(
      listings.map(async (listing) => {
        const template = templateMap.get(listing.templateId);
        const fvmResult = await getFVM(listing.templateId);
        return {
          ...listing,
          artworkUrl: template?.artworkUrl || null,
          templateName: template?.name || listing.templateId,
          rarity: template?.rarity ?? 0,
          fvm: fvmResult.fvm,
          fvmSource: fvmResult.source,
        };
      })
    );

    return NextResponse.json({ listings: enriched });
  } catch (error) {
    console.error("[marketplace/listings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create FVM endpoint**

```typescript
// frontend/app/api/marketplace/fvm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFVM } from "@/lib/fvm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId");
    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }

    const result = await getFVM(templateId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[marketplace/fvm GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/marketplace/listings/route.ts frontend/app/api/marketplace/fvm/route.ts
git commit -m "feat: GET /api/marketplace/listings + /api/marketplace/fvm endpoints"
```

---

### Task 10: API — Cancel + Buy Listing

**Covers:** S9, S16, S17 (fee calculation, cancel endpoint, buy endpoint with async+refund)

**Files:**
- Create: `frontend/app/api/marketplace/listings/[id]/cancel/route.ts`
- Create: `frontend/app/api/marketplace/listings/[id]/buy/route.ts`

**Interfaces:**
- Consumes: `cancelListing()`, `markListingSold()`, `getListingById()` from `lib/listings.ts`, `deductCredits()`, `addCredits()` from `lib/credits.ts`, `marketplaceTransfer()` from `lib/blockchain.ts`, `waitForReceipt()` from `lib/blockchain.ts`
- Produces: cancelled listing or completed purchase with on-chain transfer

- [ ] **Step 1: Create cancel endpoint**

```typescript
// frontend/app/api/marketplace/listings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getListingById, cancelListing } from "@/lib/listings";
import { getCollection } from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.sellerId !== userId) {
      return NextResponse.json({ error: "Only the seller can cancel" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing is not active" }, { status: 400 });
    }

    const success = await cancelListing(id, userId);
    if (!success) {
      return NextResponse.json({ error: "Failed to cancel listing" }, { status: 500 });
    }

    // Unmark card
    const cardsCol = await getCollection("cards");
    await cardsCol.updateOne(
      { cardId: listing.cardId },
      { $set: { isListed: false }, $unset: { listingId: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[marketplace/cancel]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create buy endpoint**

```typescript
// frontend/app/api/marketplace/listings/[id]/buy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getListingById, markListingSold } from "@/lib/listings";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { deductCredits, addCredits } from "@/lib/credits";
import { marketplaceTransfer, waitForReceipt } from "@/lib/blockchain";

const MARKETPLACE_FEE_PERCENT = 8;

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Get listing
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing is no longer active" }, { status: 400 });
    }
    if (listing.sellerId === userId) {
      return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
    }

    // Get buyer info
    const usersCol = await getCollection("users");
    const buyer = await usersCol.findOne({ _id: parseObjectId(userId) });
    if (!buyer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get card for rarity
    const cardsCol = await getCollection("cards");
    const card = await cardsCol.findOne({ cardId: listing.cardId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Deduct credits from buyer
    try {
      await deductCredits(userId, listing.price);
    } catch {
      return NextResponse.json({ error: "Insufficient credit balance" }, { status: 400 });
    }

    // Mark listing as sold (atomic — only if still active)
    const soldListing = await markListingSold(id, userId);
    if (!soldListing) {
      // Listing was sniped — refund buyer
      await addCredits(userId, listing.price);
      return NextResponse.json({ error: "Listing was just sold to someone else" }, { status: 409 });
    }

    // On-chain transfer via marketplaceTransfer
    let txHash: string | null = null;
    try {
      txHash = await marketplaceTransfer(
        listing.tokenId,
        listing.sellerWalletAddress,
        buyer.walletAddress
      );
    } catch (err) {
      console.error("[marketplace/buy] on-chain transfer failed:", err);
      // Refund buyer
      await addCredits(userId, listing.price);
      // Revert listing to active
      await getCollection("listings").then((c) =>
        c.updateOne({ listingId: id }, { $set: { status: "active" }, $unset: { buyerId: "", soldAt: "" } })
      );
      return NextResponse.json({ error: "Blockchain transfer failed. Credits refunded." }, { status: 500 });
    }

    // Wait for receipt (async pattern — ADR-018)
    let confirmed = false;
    if (txHash) {
      const receipt = await waitForReceipt(txHash, 3, 1000);
      if (receipt && receipt.status === 1) {
        confirmed = true;
      }
    }

    // Record transaction — use ACTUAL rarity from card
    const txCol = await getCollection("transactions");
    const txRecord = {
      _id: new ObjectId(),
      userId,
      type: "sold",
      tokenId: listing.tokenId,
      tokenIds: [listing.tokenId],
      rarity: card.rarity ?? 0,
      rarities: [card.rarity ?? 0],
      templateIds: [listing.templateId],
      amount: listing.price,
      purchasePrice: listing.price,
      txHash,
      status: confirmed ? "confirmed" : "pending",
      contractAddress: process.env.CONTRACT_ADDRESS || "",
      fromAddress: listing.sellerWalletAddress,
      toAddress: buyer.walletAddress,
      error: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await txCol.insertOne(txRecord);

    // Record "listed" transaction for seller
    await txCol.insertOne({
      _id: new ObjectId(),
      userId: listing.sellerId,
      type: "listed",
      tokenId: listing.tokenId,
      tokenIds: [listing.tokenId],
      rarity: card.rarity ?? 0,
      rarities: [card.rarity ?? 0],
      templateIds: [listing.templateId],
      amount: listing.price,
      purchasePrice: listing.price,
      txHash: null,
      status: "confirmed",
      contractAddress: "",
      fromAddress: listing.sellerWalletAddress,
      toAddress: "",
      error: "",
      createdAt: listing.createdAt,
      updatedAt: listing.createdAt,
    });

    if (confirmed) {
      // On-chain confirmed — finalize card ownership immediately
      await cardsCol.updateOne(
        { cardId: listing.cardId },
        {
          $set: {
            ownerAddress: buyer.walletAddress,
            isListed: false,
            status: "Digital",
            lastOnChainSync: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          $unset: { listingId: "" },
        }
      );

      // Pay seller (price - 8% fee)
      const sellerProceeds = Math.round(listing.price * (1 - MARKETPLACE_FEE_PERCENT / 100));
      await addCredits(listing.sellerId, sellerProceeds);

      return NextResponse.json({
        success: true,
        txHash,
        status: "confirmed",
        sellerProceeds,
        fee: listing.price - sellerProceeds,
      });
    } else {
      // NOT confirmed yet — set card to "pending transfer" state.
      // Do NOT finalize ownership or pay seller yet.
      // The async polling in /api/transactions (confirmTransaction) will
      // finalize: update ownerAddress, clear isListed, pay seller.
      await cardsCol.updateOne(
        { cardId: listing.cardId },
        {
          $set: {
            status: "pending",
            isListed: false,
            pendingBuyerId: userId,
            pendingBuyerWallet: buyer.walletAddress,
            pendingSellerId: listing.sellerId,
            pendingListingPrice: listing.price,
            pendingTxHash: txHash,
            updatedAt: new Date().toISOString(),
          },
          $unset: { listingId: "" },
        }
      );

      return NextResponse.json({
        success: true,
        txHash,
        status: "pending",
        message: "Transfer in progress. Card will update shortly.",
      });
    }
  } catch (error) {
    console.error("[marketplace/buy]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/marketplace/listings/\[id\]/cancel/route.ts frontend/app/api/marketplace/listings/\[id\]/buy/route.ts
git commit -m "feat: cancel + buy marketplace listing endpoints with credit transfer and on-chain tx"
```

---

### Task 11: API — Market Insight Endpoint

**Covers:** S21 (AI market insight API)

**Files:**
- Create: `frontend/app/api/marketplace/insight/route.ts`

- [ ] **Step 1: Create insight endpoint**

```typescript
// frontend/app/api/marketplace/insight/route.ts
import { NextResponse } from "next/server";
import { generateMarketInsight } from "@/lib/market-insight";

export async function GET() {
  try {
    const insight = await generateMarketInsight();
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("[marketplace/insight]", error);
    return NextResponse.json({ insight: null, error: "Failed to generate insight" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/marketplace/insight/route.ts
git commit -m "feat: GET /api/marketplace/insight — AI market insight endpoint"
```

---

### Task 12: UI — Trade Page (/marketplace)

**Covers:** S19 (Trade page with listing grid, FVM, Buy button)

**Files:**
- Modify: `frontend/app/marketplace/page.tsx` — replace placeholder with functional Trade page

**Interfaces:**
- Consumes: `GET /api/marketplace/listings`, `GET /api/marketplace/insight`
- Produces: grid of active listings with artwork, price, FVM, Buy button; Market Insight panel at top

- [ ] **Step 1: Rewrite marketplace page**

Replace entire content of `frontend/app/marketplace/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";

interface Listing {
  listingId: string;
  cardId: string;
  tokenId: number;
  templateId: string;
  sellerId: string;
  price: number;
  status: string;
  artworkUrl: string | null;
  templateName: string;
  rarity: number;
  fvm: number | null;
  fvmSource: string;
  createdAt: string;
}

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];
const RARITY_COLORS: Record<number, string> = {
  0: "#9CA3AF",
  1: "var(--electric-blue)",
  2: "var(--cosmic-violet)",
  3: "var(--aurora-gold)",
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null); // null = all
  const [user, setUser] = useState<{ user_id: string; username: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchListings();
    fetchInsight();
  }, []);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/listings");
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }

  async function fetchInsight() {
    try {
      const res = await fetch("/api/marketplace/insight");
      const data = await res.json();
      setInsight(data.insight || null);
    } catch {
      setInsight(null);
    }
  }

  async function handleBuy(listingId: string) {
    if (!user) return;
    setBuying(listingId);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchListings(); // refresh
        alert("Purchase successful!");
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch {
      alert("Network error");
    }
    setBuying(null);
  }

  const filtered = filter !== null
    ? listings.filter((l) => l.rarity === filter)
    : listings;

  return (
    <PageShell
      eyebrow="Marketplace"
      title="Trade Cards"
      description="Buy and sell digital cards with other collectors."
    >
      {/* Market Insight */}
      {insight && (
        <div className="glass p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--aurora-gold)" }}>
              Market Insight
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--silver-mist)" }}>
            {insight}
          </p>
        </div>
      )}

      {/* Rarity Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === null ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-ghost !py-1.5 !px-3 !text-xs"
          }`}
        >
          All
        </button>
        {[0, 1, 2, 3].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(filter === r ? null : r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === r ? "btn-primary !py-1.5 !px-3 !text-xs" : "btn-ghost !py-1.5 !px-3 !text-xs"
            }`}
          >
            {RARITY_NAMES[r]}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass animate-pulse h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-8 sm:p-12 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--silver-mist)" }}>
            No listings yet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--silver-mist-dim)" }}>
            Be the first to list a card for trade!
          </p>
          <Link href="/collection" className="btn-primary inline-block">
            Go to Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <div key={listing.listingId} className="glass glass-hover p-3 flex flex-col">
              {/* Artwork */}
              <div className="relative mb-3">
                {listing.artworkUrl ? (
                  <img
                    src={listing.artworkUrl}
                    alt={listing.templateName}
                    className="w-full aspect-[5/7] object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-white/5 rounded-lg flex items-center justify-center text-xs" style={{ color: "var(--silver-mist-dim)" }}>
                    No artwork
                  </div>
                )}
                <span
                  className="absolute top-2 right-2 tag-common text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${RARITY_COLORS[listing.rarity]}20`,
                    color: RARITY_COLORS[listing.rarity],
                    borderColor: `${RARITY_COLORS[listing.rarity]}40`,
                  }}
                >
                  {RARITY_NAMES[listing.rarity]}
                </span>
              </div>

              {/* Info */}
              <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-mist)" }}>
                {listing.templateName}
              </p>
              <p className="text-xs mb-1" style={{ color: "var(--silver-mist-dim)" }}>
                #{listing.cardId}
              </p>

              {/* FVM */}
              {listing.fvm !== null && (
                <p className="text-[11px] mb-2" style={{ color: "var(--silver-mist-dim)" }}>
                  FVM: <span style={{ color: "var(--aurora-gold)" }}>{listing.fvm} Credit</span>
                </p>
              )}

              {/* Price + Buy */}
              <div className="mt-auto flex items-center justify-between">
                <span className="text-base font-bold" style={{ color: "var(--aurora-gold)" }}>
                  {listing.price} Credit
                </span>
                {user && listing.sellerId !== user.user_id && (
                  <button
                    onClick={() => handleBuy(listing.listingId)}
                    disabled={buying === listing.listingId}
                    className="btn-primary !py-1 !px-3 !text-xs"
                  >
                    {buying === listing.listingId ? "..." : "Buy"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 2: Update Navbar to include Trade link**

In `frontend/components/Navbar.tsx`, add "Trade" nav item pointing to `/marketplace`. The existing "Play & Trade" link goes to `/play-trade`; change the nav to split into "Play" (`/play-trade`) and "Trade" (`/marketplace`).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/marketplace/page.tsx frontend/components/Navbar.tsx
git commit -m "feat: functional Trade page with listing grid, FVM, market insight, and buy button"
```

---

### Task 13: UI — CardItem "List for Sale" + "Cancel Listing" + Print Guard

**Covers:** S8, S20 (print guard while listed, list/cancel buttons on CardItem)

**Files:**
- Modify: `frontend/components/CardItem.tsx` — add List for Sale button, Listed badge, Cancel Listing button, print guard
- Create: `frontend/components/ListingModal.tsx` — price input modal with FVM reference

**Interfaces:**
- Consumes: `POST /api/marketplace/listings` (create), `POST /api/marketplace/listings/[id]/cancel` (cancel), `GET /api/marketplace/fvm?templateId=X` (FVM reference), `suggestListingPrice()` from `lib/market-insight.ts`
- Produces: updated CardItem with listing actions, ListingModal component

- [ ] **Step 1: Create ListingModal component**

```tsx
// frontend/components/ListingModal.tsx
"use client";

import { useState, useEffect } from "react";

interface ListingModalProps {
  cardId: string;
  templateId: string;
  userId: string;
  onClose: () => void;
  onListed: () => void;
}

export default function ListingModal({ cardId, templateId, userId, onClose, onListed }: ListingModalProps) {
  const [price, setPrice] = useState("");
  const [fvm, setFvm] = useState<number | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFvm();
    fetchSuggestion();
  }, [templateId]);

  async function fetchFvm() {
    try {
      const res = await fetch(`/api/marketplace/fvm?templateId=${templateId}`);
      const data = await res.json();
      if (data.fvm !== null) {
        setFvm(data.fvm);
        setFloor(Math.round(data.fvm * 0.7));
      }
    } catch {}
  }

  async function fetchSuggestion() {
    try {
      const res = await fetch(`/api/marketplace/suggest?templateId=${templateId}`);
      const data = await res.json();
      if (data.suggestion) setSuggestion(data.suggestion);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseInt(price);
    if (!priceNum || priceNum <= 0) {
      setError("Enter a valid price");
      return;
    }
    if (floor && priceNum < floor) {
      setError(`Minimum price is ${floor} Credit (FVM floor)`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cardId, price: priceNum }),
      });
      const data = await res.json();
      if (res.ok) {
        onListed();
        onClose();
      } else {
        setError(data.error || "Failed to create listing");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="glass p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--silver-mist)" }}>
          List for Sale
        </h3>

        {/* FVM Reference */}
        {fvm !== null && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(255,196,102,0.08)", border: "1px solid rgba(255,196,102,0.2)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--aurora-gold)" }}>
              Fair Value Market
            </p>
            <p className="text-sm" style={{ color: "var(--silver-mist)" }}>
              {fvm} Credit (min: {floor} Credit)
            </p>
          </div>
        )}

        {/* AI Suggestion */}
        {suggestion && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(184,172,255,0.08)", border: "1px solid rgba(184,172,255,0.2)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--cosmic-violet)" }}>
              AI Price Suggestion
            </p>
            <p className="text-sm" style={{ color: "var(--silver-mist)" }}>
              {suggestion}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="text-xs font-semibold block mb-1" style={{ color: "var(--silver-mist-dim)" }}>
            Price (Credit)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={floor || 1}
            placeholder={floor ? `Min ${floor}` : "Enter price"}
            className="w-full p-3 rounded-lg mb-3 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "var(--silver-mist)",
            }}
          />

          {error && (
            <p className="text-xs mb-3" style={{ color: "var(--aurora-pink)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Listing..." : "List Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update CardItem with listing actions**

In `frontend/components/CardItem.tsx`:
1. Add "Listed" badge (replaces normal status badge when `isListed === true`)
2. Add "List for Sale" button when: `status === "Digital"` AND `!isListed` AND `!fulfillmentStatus`
3. Block Print button when `isListed === true` (show tooltip "Cannot print while listed")
4. Add "Cancel Listing" button when `isListed === true`

- [ ] **Step 3: Add print guard to /api/print**

In `frontend/app/api/print/route.ts`, add validation at the top of the POST handler:

```typescript
// Check if card is listed — block print while listed
if (card.isListed) {
  return NextResponse.json(
    { error: "Card is listed for sale. Cancel listing before requesting print." },
    { status: 400 }
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ListingModal.tsx frontend/components/CardItem.tsx frontend/app/api/print/route.ts
git commit -m "feat: list for sale button, cancel listing, print guard while listed"
```

---

### Task 14: API — Price Suggestion Endpoint

**Covers:** S22 (suggestListingPrice API)

**Files:**
- Create: `frontend/app/api/marketplace/suggest/route.ts`

- [ ] **Step 1: Create suggest endpoint**

```typescript
// frontend/app/api/marketplace/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { suggestListingPrice } from "@/lib/market-insight";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId");
    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }

    const suggestion = await suggestListingPrice(templateId);
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("[marketplace/suggest]", error);
    return NextResponse.json({ suggestion: null, error: "Failed to generate suggestion" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/marketplace/suggest/route.ts
git commit -m "feat: GET /api/marketplace/suggest — AI price suggestion endpoint"
```

---

### Task 15: Transaction Type Extension + Scan Page Integration

**Covers:** S6 (transaction types "listed" and "sold" in existing collection)

**Files:**
- Modify: `frontend/lib/status-map.ts` — add friendly labels for "listed" and "sold"
- Modify: `frontend/app/scan/page.tsx` — display "listed" and "sold" in transaction history
- Modify: `frontend/app/profile/page.tsx` — display "listed" and "sold" in transaction history

**Interfaces:**
- Consumes: existing transaction history display patterns
- Produces: new transaction type labels + display in scan/profile

- [ ] **Step 1: Update status-map.ts**

Add friendly labels for the new transaction types:

```typescript
// In the type label mapping, add:
listed: "Listed for Sale",
sold: "Sold",
```

- [ ] **Step 2: Update scan page transaction history**

In `frontend/app/scan/page.tsx`, ensure the transaction history section handles `type: "listed"` and `type: "sold"` with appropriate display:
- "Listed for Sale" — shows listing price
- "Sold" — shows sale price with buyer/seller info

- [ ] **Step 3: Update profile transaction history**

In `frontend/app/profile/page.tsx`, add "Listed" and "Sold" to the transaction type display in the history table.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/status-map.ts frontend/app/scan/page.tsx frontend/app/profile/page.tsx
git commit -m "feat: add listed/sold transaction type display in scan and profile pages"
```

---

### Task 16: ADR-010 Supersession + Documentation Update

**Covers:** Documentation — supersede ADR-010, update MEMORY.md

**Files:**
- Modify: `DECISIONS.md` — mark ADR-010 as superseded, add new ADR for marketplace
- Modify: `MEMORY.md` — update project status

- [ ] **Step 1: Add new ADR to DECISIONS.md**

After ADR-010, add:

```markdown
## ADR-024: Marketplace — Functional Trade System
**Status**: Accepted — supersedes ADR-010
**Decision**: Implement full marketplace with listing, buying, cancelling. Cards listed via `isListed` flag (MongoDB) + `marketplaceTransfer()` on-chain. Marketplace fee 8%. FVM (Fair Value Market) calculates average sold price per template. AI-powered market insight and price suggestion via Gemini API. Print blocked while card is listed.
**Reason**: Enhances demo value for hackathon. Shows full card lifecycle: mint → collect → trade → print → redeem. Blockchain abstraction maintained — users see Credit prices, not crypto.
```

- [ ] **Step 2: Update MEMORY.md**

Update "Current Sprint" and "Open Items" sections to reflect marketplace feature completion.

- [ ] **Step 3: Commit**

```bash
git add DECISIONS.md MEMORY.md
git commit -m "docs: supersede ADR-010 with ADR-024 marketplace, update MEMORY.md"
```

---

### Task 17: Final Verification + Deploy

**Covers:** End-to-end verification

**Files:** All modified files

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run Foundry tests**

```bash
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd /d/Gachard/contracts && forge test 2>&1"
```

Expected: All 36 tests pass.

- [ ] **Step 3: Run seed script**

```bash
cd frontend && npx tsx scripts/seed-marketplace.ts
```

Expected: ~25 sold transactions seeded.

- [ ] **Step 4: Test API endpoints manually**

Test each endpoint:
1. `POST /api/marketplace/listings` — create listing
2. `GET /api/marketplace/listings` — browse listings
3. `POST /api/marketplace/listings/[id]/cancel` — cancel listing
4. `POST /api/marketplace/listings/[id]/buy` — buy listing
5. `GET /api/marketplace/fvm?templateId=common-1` — get FVM
6. `GET /api/marketplace/insight` — AI insight
7. `GET /api/marketplace/suggest?templateId=common-1` — AI price suggestion

- [ ] **Step 5: Push and deploy**

```bash
git push
```

Verify Vercel auto-deploy triggers. Check deployed URL.

---

## Summary: Spec Coverage

| Spec Item | Task |
|-----------|------|
| S1: marketplaceTransfer function | Task 1, 2 |
| S2: Foundry tests | Task 1, 2 |
| S3: Redeploy contract | Task 3 |
| S4: listings collection | Task 4 |
| S5: cards.isListed/listingId | Task 4, 8 |
| S6: listed/sold transaction types | Task 15 |
| S7: Listing validation rules | Task 8 |
| S8: Print guard while listed | Task 13 |
| S9: 8% marketplace fee | Task 10 |
| S10: FVM floor pricing | Task 5, 8 |
| S11: FVM calculation | Task 5 |
| S12: FVM display | Task 9, 12 |
| S13: Seed data script | Task 6 |
| S14: POST /api/marketplace/listings | Task 8 |
| S15: GET /api/marketplace/listings | Task 9 |
| S16: POST cancel | Task 10 |
| S17: POST buy | Task 10 |
| S18: GET /api/marketplace/fvm | Task 9 |
| S19: Trade page UI | Task 12 |
| S20: CardItem listing actions | Task 13 |
| S21: AI Market Insight | Task 7, 11 |
| S22: AI Price Suggestion | Task 7, 14 |

**Total: 17 tasks, all 22 spec items covered.**
