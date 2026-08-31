# Dismantle & Crystal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to permanently burn ("dismantle") Digital cards on-chain in exchange for Crystal — a new non-purchasable currency stored in its own MongoDB collection.

**Architecture:** `burnCard()` on the existing GachardCard ERC1155 contract destroys the token permanently. The backend API `POST /api/dismantle` orchestrates ownership validation, on-chain burn, Crystal crediting, and card status update. Crystal ledger (`lib/crystal.ts`) mirrors `credits.ts` structure but with no topup endpoint. UI adds a Dismantle button on CardItem (Digital cards only) with an explicit confirmation modal, and Crystal balance display on the Profile page.

**Tech Stack:** Solidity 0.8.24 + Foundry (smart contract), Next.js API routes + MongoDB (backend), React 19 + Tailwind v4 (frontend)

## Global Constraints

- Only cards with `status === "Digital"`, `isListed === false`, `fulfillmentStatus === null` can be dismantled
- Crystal can ONLY be obtained via dismantle — no topup, no purchase, no transfer endpoint
- Burned cards change status to `"Burned"` in MongoDB (not deleted) for provenance/scan transparency
- Burned cards must NOT appear in the Collection grid or Profile card list
- Burned cards MUST remain searchable via Scan by Card ID for provenance verification
- Crystal balance uses a separate `crystal_balances` collection — never mixed with `credits`
- Dismantle rates: Common=20, Rare=50, Epic=120, Legendary=300 Crystal
- Confirmation modal is mandatory before every dismantle — this is a permanent action
- `burnCard()` only works on Digital cards (the existing `_update()` override already blocks Vaulted burns)
- Transaction type `"dismantled"` added to Transaction interface and status-map

---

### Task 1: Smart Contract — `burnCard()` function

**Covers:** Spec §1 (burnCard function + event)

**Files:**
- Modify: `contracts/src/GachardCard.sol:14-30` (add event + function)

**Interfaces:**
- Produces: `burnCard(uint256 tokenId, address owner) external onlyOwner` — called by Task 5's `POST /api/dismantle`
- Produces: `CardBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity)` event

- [ ] **Step 1: Add `CardBurned` event**

In `contracts/src/GachardCard.sol`, add after line 30 (after `VerificationRecorded` event):

```solidity
event CardBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity);
```

- [ ] **Step 2: Add `burnCard()` function**

Add after `recordVerification()` (after line 162), before `_update()`:

```solidity
/**
 * @notice Burn kartu secara permanen — token dihancurkan, tidak bisa dipulihkan
 * @dev onlyOwner — backend yang memanggil (ADR-003, custodial model)
 * @dev Hanya kartu Digital yang bisa di-burn. _update() override sudah memblokir
 *      burn untuk kartu Vaulted karena _burn() memanggil _update(owner, address(0))
 *      dan from != address(0) akan trigger revert "Card is vaulted".
 * @param tokenId ID kartu yang akan di-burn
 * @param owner Alamat pemilik kartu saat ini
 */
function burnCard(uint256 tokenId, address owner) external onlyOwner {
    require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
    require(balanceOf(owner, tokenId) == 1, "Owner does not hold card");

    Rarity rarity = cardRarity[tokenId];
    _burn(owner, tokenId, 1);

    emit CardBurned(tokenId, owner, uint8(rarity));
}
```

Key design notes:
- `_burn()` internally calls `_update(owner, address(0), [tokenId], [1])`. The `_update()` override checks `cardStatus[ids[i]] == Vaulted && from != address(0)` — since we require `Digital` status, this check passes. No modification to `_update()` needed.
- After `_burn()`, `balanceOf(owner, tokenId)` returns 0. Any subsequent transfer attempt will fail at the ERC1155 level (insufficient balance).
- `cardStatus[tokenId]` mapping entry remains `Digital` (0) after burn — the token simply doesn't exist on-chain anymore. MongoDB handles the `"Burned"` status.
- `cardRarity[tokenId]` mapping entry remains readable after burn for audit purposes.

- [ ] **Step 3: Verify contract compiles**

Run: `cd contracts && forge build`
Expected: `Compiler run successful`

- [ ] **Step 4: Commit**

```bash
git add contracts/src/GachardCard.sol
git commit -m "feat(contract): add burnCard() with CardBurned event"
```

---

### Task 2: Smart Contract — Foundry tests for `burnCard()`

**Covers:** Spec §2 (burn tests)

**Files:**
- Modify: `contracts/test/GachardCard.t.sol` (add new test section after line 494)

**Interfaces:**
- Consumes: `burnCard(uint256, address)` from Task 1
- Consumes: `CardBurned` event from Task 1

- [ ] **Step 1: Write burn success test**

Add a new test section at the end of `GachardCardTest` (after line 494):

```solidity
// ============================================
// Section 8: burnCard tests
// ============================================

function test_burnCard_removes_token() public {
    uint256 tokenId = card.mintCard(user1, 0); // Common
    card.burnCard(tokenId, user1);
    assertEq(card.balanceOf(user1, tokenId), 0);
}

function test_burnCard_cannot_transfer_after_burn() public {
    uint256 tokenId = card.mintCard(user1, 0);
    card.burnCard(tokenId, user1);

    // Attempting to transfer burned token should revert (balance is 0)
    vm.expectRevert();
    card.marketplaceTransfer(tokenId, user1, user2);
}

function test_burnCard_emits_event_with_rarity() public {
    uint256 tokenId = card.mintCard(user1, 2); // Epic

    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardBurned(tokenId, user1, 2);
    card.burnCard(tokenId, user1);
}

function test_burnCard_emits_event_all_rarities() public {
    // Common=0
    uint256 t1 = card.mintCard(user1, 0);
    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardBurned(t1, user1, 0);
    card.burnCard(t1, user1);

    // Rare=1
    uint256 t2 = card.mintCard(user1, 1);
    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardBurned(t2, user1, 1);
    card.burnCard(t2, user1);

    // Legendary=3
    uint256 t3 = card.mintCard(user1, 3);
    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardBurned(t3, user1, 3);
    card.burnCard(t3, user1);
}

function test_burnCard_reverts_when_vaulted() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("test");
    card.requestPrint(tokenId, hash, user1); // status -> Vaulted

    vm.expectRevert("Card is not digital");
    card.burnCard(tokenId, user1);
}

function test_burnCard_reverts_when_not_owner() public {
    uint256 tokenId = card.mintCard(user1, 0);

    vm.prank(user2);
    vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user2));
    card.burnCard(tokenId, user1);
}

function test_burnCard_reverts_when_not_holder() public {
    uint256 tokenId = card.mintCard(user1, 0);

    // user2 doesn't hold the card
    vm.expectRevert("Owner does not hold card");
    card.burnCard(tokenId, user2);
}

function test_burnCard_reverts_when_already_burned() public {
    uint256 tokenId = card.mintCard(user1, 0);
    card.burnCard(tokenId, user1);

    // Second burn attempt — balance is 0
    vm.expectRevert("Owner does not hold card");
    card.burnCard(tokenId, user1);
}
```

- [ ] **Step 2: Run tests**

Run: `cd contracts && forge test --match-contract GachardCardTest -vvv`
Expected: All 43 existing tests + 8 new burn tests pass (total 51).

- [ ] **Step 3: Commit**

```bash
git add contracts/test/GachardCard.t.sol
git commit -m "test(contract): add burnCard tests (8 cases)"
```

---

### Task 3: Redeploy contract + update address

**Covers:** Spec §3 (redeploy after tests pass)

**Files:**
- Modify: `frontend/.env.local` (CONTRACT_ADDRESS)

**Interfaces:**
- Consumes: compiled contract from Task 1-2
- Produces: new CONTRACT_ADDRESS for Task 5's blockchain calls

- [ ] **Step 1: Deploy new contract**

Run: `cd contracts && source .env && forge script script/Deploy.s.sol:DeployScript --rpc-url bsc_testnet --broadcast --verify`
Expected: New contract address printed in output.

- [ ] **Step 2: Update `.env.local`**

Update `CONTRACT_ADDRESS` in `frontend/.env.local` to the new deployed address.

- [ ] **Step 3: Verify on BSCScan**

Confirm the new contract is verified and readable on `https://testnet.bscscan.com/address/<new_address>`.

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.local
git commit -m "chore: update CONTRACT_ADDRESS to burnCard-enabled deploy"
```

---

### Task 4: Crystal ledger library

**Covers:** Spec §4 (crystal.ts), §5 (crystal_balances collection), §6 (dismantle rates)

**Files:**
- Create: `frontend/lib/crystal.ts`

**Interfaces:**
- Produces: `getCrystalBalance(userId: string) => Promise<number>` — consumed by Task 7 (API) and Task 9 (Profile UI)
- Produces: `addCrystal(userId: string, amount: number) => Promise<number>` — consumed by Task 7 (API)
- Produces: `DISMANTLE_RATES` constant — consumed by Task 7 (API)

- [ ] **Step 1: Create `frontend/lib/crystal.ts`**

```typescript
import { getCollection } from "./mongodb";

/**
 * Dismantle reward rates per rarity (Crystal).
 * Proportional to FVM price ranges: Common < Rare < Epic < Legendary.
 */
export const DISMANTLE_RATES: Record<string, number> = {
  Common: 20,
  Rare: 50,
  Epic: 120,
  Legendary: 300,
};

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];

export function getDismantleRate(rarity: number): number {
  return DISMANTLE_RATES[RARITY_NAMES[rarity]] ?? 0;
}

/**
 * Get user's Crystal balance.
 * Returns 0 if user has no Crystal record yet.
 */
export async function getCrystalBalance(userId: string): Promise<number> {
  const collection = await getCollection("crystal_balances");
  const record = await collection.findOne({ userId });
  return record?.balance ?? 0;
}

/**
 * Add Crystal to user's balance. Only called internally from dismantle flow.
 * No public endpoint exposes this directly.
 * Returns new balance.
 */
export async function addCrystal(userId: string, amount: number): Promise<number> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const collection = await getCollection("crystal_balances");
  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount },
      $setOnInsert: { userId, createdAt: new Date().toISOString() },
      $set: { updatedAt: new Date().toISOString() },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result?.balance ?? amount;
}
```

Key differences from `credits.ts`:
- No `deductCredits` equivalent — Crystal cannot be spent yet (trading is roadmap)
- No max amount cap on `addCrystal` — dismantle rewards are fixed by rate table
- Collection name is `crystal_balances`, not `credits` — completely separate

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/crystal.ts
git commit -m "feat(lib): add Crystal ledger with dismantle rates"
```

---

### Task 5: API endpoint — `POST /api/dismantle`

**Covers:** Spec §7 (dismantle endpoint with all validations)

**Files:**
- Modify: `frontend/lib/blockchain.ts:9-27` (add burnCard to ABI + wrapper function)
- Create: `frontend/app/api/dismantle/route.ts`
- Modify: `frontend/lib/transactions.ts:13` (add "dismantled" to type union)
- Modify: `frontend/lib/status-map.ts:18-26` (add dismantled to TX_TYPE_MAP)
- Modify: `frontend/app/api/admin/clean-slate/route.ts:16-26` (add crystal_balances to collections)

**Interfaces:**
- Consumes: `burnCard(tokenId, ownerAddress)` from blockchain.ts
- Consumes: `getCrystalBalance`, `addCrystal`, `getDismantleRate` from Task 4
- Consumes: ownership validation pattern from `print/route.ts`
- Produces: `POST /api/dismantle` endpoint — consumed by Task 8 (CardItem UI)

- [ ] **Step 1: Add `burnCard` to blockchain.ts ABI and wrapper**

In `frontend/lib/blockchain.ts`, add to `GACHARD_ABI` array (after line 26):

```typescript
"function burnCard(uint256 tokenId, address owner) external",
"event CardBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity)",
```

Add wrapper function after `getBalance` (after line 155):

```typescript
export async function burnCard(tokenId: number, ownerAddress: string): Promise<string> {
  const contract = getContract();
  const tx = await contract.burnCard(tokenId, ownerAddress);
  return tx.hash;
}
```

- [ ] **Step 2: Add "dismantled" to Transaction type**

In `frontend/lib/transactions.ts`, change line 13 from:

```typescript
type: "mint" | "print" | "redeem" | "transfer" | "topup";
```

to:

```typescript
type: "mint" | "print" | "redeem" | "transfer" | "topup" | "dismantled";
```

- [ ] **Step 3: Add "dismantled" to status-map**

In `frontend/lib/status-map.ts`, add to `TX_TYPE_MAP` (after line 25):

```typescript
dismantled: "Dismantled",
```

- [ ] **Step 4: Add `crystal_balances` to clean-slate collections**

In `frontend/app/api/admin/clean-slate/route.ts`, add `"crystal_balances"` to the collections array (after `"supporters"`).

- [ ] **Step 5: Create `POST /api/dismantle` route**

Create `frontend/app/api/dismantle/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCollection, parseObjectId } from "@/lib/mongodb";
import { burnCard, waitForReceipt } from "@/lib/blockchain";
import { addCrystal, getDismantleRate } from "@/lib/crystal";
import { generateInvoiceId } from "@/lib/invoice";

export const maxDuration = 15;

const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary"];

export async function POST(request: Request) {
  try {
    const { userId, cardId, tokenId } = await request.json();

    if (!userId || (!cardId && tokenId === undefined)) {
      return NextResponse.json({ error: "userId and cardId (or tokenId) are required" }, { status: 400 });
    }

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: parseObjectId(userId) } as Record<string, unknown>);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get card — prefer cardId, fallback to tokenId
    const cardsCollection = await getCollection("cards");
    const card = cardId
      ? await cardsCollection.findOne({ cardId })
      : await cardsCollection.findOne({ tokenId });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Resolve the canonical identifier from the query result — NOT from request body
    // (cardId from body could be undefined if only tokenId was sent)
    const resolvedCardId = card.cardId ?? card._id.toString();

    // Verify ownership
    if (card.ownerAddress !== user.walletAddress) {
      return NextResponse.json({ error: "Card does not belong to this user" }, { status: 403 });
    }

    // Validate card state: must be Digital, not listed, not in fulfillment
    if (card.status !== "Digital") {
      return NextResponse.json({ error: "Only Digital cards can be dismantled" }, { status: 400 });
    }
    if (card.isListed) {
      return NextResponse.json({ error: "Card is listed for sale. Cancel listing before dismantling." }, { status: 400 });
    }
    if (card.fulfillmentStatus) {
      return NextResponse.json({ error: "Card is in fulfillment process and cannot be dismantled" }, { status: 400 });
    }

    // Calculate Crystal reward
    const rarity = card.rarity ?? 0;
    const crystalReward = getDismantleRate(rarity);
    if (crystalReward === 0) {
      return NextResponse.json({ error: "Invalid card rarity" }, { status: 400 });
    }

    // Burn on-chain
    const txHash = await burnCard(card.tokenId, user.walletAddress);

    // Record transaction as pending
    const contractAddress = process.env.CONTRACT_ADDRESS!;
    const txCollection = await getCollection("transactions");
    const txResult = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "dismantled",
      tokenId: card.tokenId,
      rarity,
      txHash,
      status: "pending",
      contractAddress,
      fromAddress: user.walletAddress,
      toAddress: "0x0000000000000000000000000000000000000000",
      amount: crystalReward,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mark card as Burned using resolvedCardId (not request body cardId)
    await cardsCollection.updateOne(
      { cardId: resolvedCardId },
      {
        $set: {
          status: "Burned",
          burnedAt: new Date().toISOString(),
          dismantleTxId: txResult.insertedId.toString(),
          crystalReward,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Credit Crystal to user
    const newBalance = await addCrystal(user._id.toString(), crystalReward);

    // Background: wait for on-chain receipt and confirm transaction
    // Uses after() from next/server — same pattern as marketplace buy route
    // Response returns immediately with "pending" status
    after(async () => {
      try {
        const receipt = await waitForReceipt(txHash);
        if (receipt && receipt.status === 1) {
          await txCollection.updateOne(
            { _id: txResult.insertedId },
            { $set: { status: "confirmed", updatedAt: new Date().toISOString() } }
          );
        } else {
          await txCollection.updateOne(
            { _id: txResult.insertedId },
            { $set: { status: "failed", error: "On-chain transaction failed or timed out", updatedAt: new Date().toISOString() } }
          );
        }
      } catch (err) {
        console.error("[dismantle] background receipt confirmation failed:", err);
      }
    });

    return NextResponse.json({
      status: "pending",
      txId: generateInvoiceId(txResult.insertedId.toString()),
      crystalReward,
      crystalBalance: newBalance,
      rarity: RARITY_NAMES[rarity],
    });
  } catch (error) {
    console.error("Dismantle error:", error);
    return NextResponse.json({ error: "Dismantle failed" }, { status: 500 });
  }
}
```

Key design decisions:
- Ownership validation follows exact same pattern as `print/route.ts` (lines 14-38)
- **`resolvedCardId`** is derived from the query result (`card.cardId ?? card._id.toString()`), NOT from the request body — prevents update to wrong/missing document when only `tokenId` is sent
- Crystal is credited immediately after burn tx is sent (before on-chain confirmation) — consistent with async pattern (ADR-018)
- Card status changes to `"Burned"` with `burnedAt` timestamp for provenance
- Transaction type is `"dismantled"` with `amount` field storing the Crystal reward
- **Background confirmation via `after()`** — same pattern as `marketplace/listings/[id]/buy/route.ts`. Response returns `"pending"` immediately; receipt polling + status update happens in background. Uses `waitForReceipt()` from `blockchain.ts` (existing utility with retry logic)

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/blockchain.ts frontend/lib/transactions.ts frontend/lib/status-map.ts frontend/app/api/admin/clean-slate/route.ts frontend/app/api/dismantle/route.ts
git commit -m "feat(api): add POST /api/dismantle with burn + Crystal crediting"
```

---

### Task 6: Crystal balance API endpoint

**Covers:** Spec §9 (Crystal balance display — backend support)

**Files:**
- Create: `frontend/app/api/crystal/route.ts`

**Interfaces:**
- Consumes: `getCrystalBalance` from Task 4
- Produces: `GET /api/crystal?userId=...` — consumed by Task 9 (Profile UI)

- [ ] **Step 1: Create `GET /api/crystal` route**

Create `frontend/app/api/crystal/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getCrystalBalance } from "@/lib/crystal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const balance = await getCrystalBalance(userId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Crystal balance error:", error);
    return NextResponse.json({ error: "Failed to fetch crystal balance" }, { status: 500 });
  }
}
```

Follows exact same pattern as `GET /api/credits` (`frontend/app/api/credits/route.ts`).

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/crystal/route.ts
git commit -m "feat(api): add GET /api/crystal balance endpoint"
```

---

### Task 7: Dismantle button + confirmation modal on CardItem

**Covers:** Spec §8 (Dismantle button + confirmation modal)

**Files:**
- Modify: `frontend/components/CardItem.tsx:80-92` (add state + canDismantle boolean)
- Modify: `frontend/components/CardItem.tsx:306-394` (add Dismantle button in action section)
- Modify: `frontend/components/CardItem.tsx:427-471` (add confirmation modal after Cancel Listing modal)

**Interfaces:**
- Consumes: `POST /api/dismantle` from Task 5
- Consumes: `canDismantle` logic: `currentStatus === "Digital" && !isListed && tokenId !== null`

- [ ] **Step 1: Add dismantle state variables**

In `frontend/components/CardItem.tsx`, after line 86 (`const [cancelling, setCancelling] = useState(false);`), add:

```typescript
const [showDismantleConfirm, setShowDismantleConfirm] = useState(false);
const [dismantling, setDismantling] = useState(false);
```

After line 92 (`const isReal = currentStatus === "Real";`), add:

```typescript
const canDismantle = currentStatus === "Digital" && !isListed && tokenId !== null;
```

- [ ] **Step 2: Add dismantle handler**

After the `confirmCancelListing` function (around line 195-210), add:

```typescript
const confirmDismantle = async () => {
  if (!tokenId) return;
  setDismantling(true);
  try {
    const res = await fetch("/api/dismantle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, cardId, tokenId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Dismantle failed");
      return;
    }
    setCurrentStatus("Burned");
    setShowDismantleConfirm(false);
    onStatusChange?.(tokenId, "Burned");
  } catch {
    alert("Dismantle failed. Please try again.");
  } finally {
    setDismantling(false);
  }
};
```

- [ ] **Step 3: Add Dismantle button in action section**

In the action buttons section (after the Print button block, around line 341), add:

```typescript
{!isListed && canDismantle && (
  <button
    onClick={() => setShowDismantleConfirm(true)}
    className="w-full !py-2 !px-3 !text-[0.65rem] font-medium rounded-full transition-all hover:-translate-y-px cursor-pointer"
    style={{
      background: "transparent",
      border: "1px solid rgba(255,107,186,0.4)",
      color: "var(--aurora-pink)",
    }}
    data-testid={`dismantle-${tokenId}`}
  >
    Dismantle
  </button>
)}
```

Uses `--aurora-pink` (#FF6BBA) border+text to signal destructive action, consistent with the Cancel Listing modal's pink accent.

- [ ] **Step 4: Add Dismantle confirmation modal**

After the Cancel Listing Confirm Modal block (after line 471), add:

```typescript
{/* Dismantle Confirm Modal */}
{showDismantleConfirm && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    onClick={() => setShowDismantleConfirm(false)}
  >
    <div
      className="w-full max-w-sm rounded-2xl p-6"
      style={{
        background: "rgba(15,19,36,0.95)",
        border: "1px solid rgba(255,107,186,0.3)",
        boxShadow: "0 0 40px rgba(255,107,186,0.15)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-base font-semibold mb-2" style={{ color: "var(--silver-mist)" }}>
        Dismantle Card?
      </h3>
      <p className="text-sm mb-2" style={{ color: "var(--silver-mist-dim)" }}>
        This will permanently destroy this card on the blockchain and cannot be undone.
      </p>
      <p className="text-sm mb-5 font-medium" style={{ color: "var(--electric-blue)" }}>
        You will receive {dismantleRate} Crystal.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setShowDismantleConfirm(false)}
          className="btn-ghost flex-1 !py-2.5"
        >
          Keep Card
        </button>
        <button
          onClick={confirmDismantle}
          disabled={dismantling}
          className="flex-1 !py-2.5 font-semibold rounded-full transition-transform hover:-translate-y-px cursor-pointer disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(255,107,186,0.9), rgba(184,172,255,0.9))",
            color: "#fff",
            border: "none",
            boxShadow: "0 8px 26px -8px rgba(255,107,186,0.55)",
          }}
        >
          {dismantling ? "Dismantling…" : "Dismantle"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Add dismantle rate constant**

At the top of CardItem.tsx, after the `RARITY_LABELS` constant (after line 17), add:

```typescript
const DISMANTLE_RATES = [20, 50, 120, 300]; // Common, Rare, Epic, Legendary
```

In the component, after `canDismantle` (around line 95), add:

```typescript
const dismantleRate = DISMANTLE_RATES[rarity] ?? 0;
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/CardItem.tsx
git commit -m "feat(ui): add Dismantle button with confirmation modal on CardItem"
```

---

### Task 8: Crystal balance on Profile page

**Covers:** Spec §9 (Crystal balance display — visual difference from Credit)

**Files:**
- Modify: `frontend/app/profile/page.tsx:229-256` (add Crystal balance block after Credit balance)

**Interfaces:**
- Consumes: `GET /api/crystal?userId=...` from Task 6

- [ ] **Step 1: Add Crystal balance state**

In `frontend/app/profile/page.tsx`, after the `balance` state declaration (around line 30), add:

```typescript
const [crystalBalance, setCrystalBalance] = useState<number | null>(null);
```

- [ ] **Step 2: Fetch Crystal balance**

After the credits fetch block (around line 77), add:

```typescript
fetch(`/api/crystal?userId=${user.user_id}`)
  .then((r) => r.json())
  .then((d: { balance?: number }) => {
    if (!cancelled) setCrystalBalance(d.balance ?? 0);
  })
  .catch(() => {});
```

- [ ] **Step 3: Render Crystal balance block**

After the Credit Balance block (after line 256, before the closing `</div>` of the left column identity section), add:

```typescript
<div
  className="p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-3"
  style={{
    background:
      "linear-gradient(135deg, rgba(0,204,255,0.12), rgba(184,172,255,0.06))",
    border: "1px solid rgba(0,204,255,0.3)",
  }}
  data-testid="profile-crystal-balance"
>
  <div>
    <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/60 mb-1">
      Crystal Balance
    </p>
    <p
      className="font-display text-lg sm:text-xl lg:text-2xl"
      style={{ color: "var(--electric-blue)" }}
    >
      {(crystalBalance ?? 0).toLocaleString()}
    </p>
  </div>
  <span
    className="!py-2 !px-3 sm:!py-2.5 sm:!px-4 !text-[0.6rem] sm:!text-[0.7rem] whitespace-nowrap rounded-full font-medium"
    style={{
      background: "rgba(0,204,255,0.1)",
      border: "1px solid rgba(0,204,255,0.3)",
      color: "var(--electric-blue)",
    }}
  >
    ✦ Crystal
  </span>
</div>
```

Visual differences from Credit balance:
- **Color**: `--electric-blue` (#00CCFF) instead of `--aurora-gold` (#FFC466)
- **Gradient**: Blue-to-violet instead of gold-to-pink
- **Border**: Blue instead of gold
- **Right side**: Static "Crystal" badge instead of "Top Up" link (Crystal cannot be purchased)
- No link/action button — Crystal is earned only through dismantle

- [ ] **Step 4: Commit**

```bash
git add frontend/app/profile/page.tsx
git commit -m "feat(ui): add Crystal balance display on Profile page"
```

---

### Task 9: Filter Burned cards from Collection grid

**Covers:** Spec §10 (Burned cards not in active collection)

**Files:**
- Modify: `frontend/app/collection/page.tsx` (filter out Burned status)
- Modify: `frontend/app/profile/page.tsx` (filter out Burned from card grid if applicable)

**Interfaces:**
- Consumes: `"Burned"` status set by Task 5's `POST /api/dismantle`

- [ ] **Step 1: Filter Burned cards in Collection page**

In `frontend/app/collection/page.tsx`, find where cards are filtered/rendered. Add a filter to exclude cards with `status === "Burned"`:

```typescript
const visibleCards = cards.filter((card) => card.status !== "Burned");
```

Use `visibleCards` instead of `cards` in the grid rendering.

- [ ] **Step 2: Filter Burned cards in Profile page**

In `frontend/app/profile/page.tsx`, find where user's cards are rendered in the collection grid. Add the same filter:

```typescript
const visibleCards = cards.filter((card) => card.status !== "Burned");
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/collection/page.tsx frontend/app/profile/page.tsx
git commit -m "feat(ui): filter Burned cards from Collection and Profile grids"
```

---

### Task 10: ADR-026 — Dismantle & Crystal decision record

**Covers:** Spec §11 (ADR documentation)

**Files:**
- Modify: `DECISIONS.md` (append ADR-026)

**Interfaces:**
- None (documentation only)

- [ ] **Step 1: Append ADR-026**

Append to `DECISIONS.md`:

```markdown
## ADR-026: Dismantle & Crystal — Burn-to-Earn Currency
**Status**: Accepted
**Decision**: Kartu Digital dapat di-"dismantle" (burn permanen on-chain) untuk mendapatkan Crystal — currency baru yang TIDAK bisa dibeli, di-top-up, atau ditransfer. Crystal hanya bisa didapat dari dismantle. Collection `crystal_balances` terpisah total dari `credits` supaya kedua currency tidak pernah tercampur. Kartu yang sudah di-burn berubah status jadi `"Burned"` di MongoDB (bukan dihapus) untuk menjaga provenance dan transparansi via Scan. Burned card tidak muncul di grid Collection aktif tetapi tetap bisa dicari by Card ID.
**Dismantle rates**: Common=20, Rare=50, Epic=120, Legendary=300 Crystal (proporsional ke rentang harga FVM).
**On-chain**: `burnCard(tokenId, owner)` memanggil OpenZeppelin `_burn()` yang menghancurkan token ERC1155 secara permanen. Hanya kartu Digital yang bisa di-burn — kartu Vaulted diblokir oleh `_update()` override yang sudah ada.
**Menggantikan konsep Buyback**: Dismantle & Crystal menggantikan rencana buyback — burn permanen on-chain, currency baru non-purchasable/non-cashable, tanpa liabilitas finansial.
**Roadmap (TIDAK dibangun di sesi ini)**: Sistem trading Crystal antar-user akan menginfrastruktur ulang Marketplace yang sudah ada. Crystal akan jadi currency alternatif untuk listing dan membeli kartu dari user lain.
**Reason**: Burn on-chain membuktikan kartu benar-benar dihancurkan (transparan, teraudit di BSCScan). Crystal sebagai non-purchasable currency menghindari liabilitas finansial dan regulasi. Pemisahan collection mencegah bug cross-currency.
**Known limitation**: Setelah burn, `cardStatus(tokenId)` on-chain tetap menunjukkan nilai terakhir sebelum burn (tidak di-reset ke state "Burned") karena token ERC1155 sudah tidak ada setelah `_burn()`. Sumber kebenaran status "Burned" ada di MongoDB (`cards.status === "Burned"`). Perlu diingat kalau nanti ada fitur yang membaca `cardStatus` langsung dari chain tanpa cross-check MongoDB — perlu cek `balanceOf(owner, tokenId) == 0` sebagai indikator burn.
```

- [ ] **Step 2: Commit**

```bash
git add DECISIONS.md
git commit -m "docs: add ADR-026 for Dismantle & Crystal system"
```

---

### Task 11: End-to-end verification

**Covers:** Full integration verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run Foundry tests**

Run: `cd contracts && forge test --match-contract GachardCardTest -vvv`
Expected: All 51 tests pass (43 existing + 8 new burn tests).

- [ ] **Step 2: Run Next.js type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Manual API test — dismantle flow**

Using curl or browser dev tools:
1. Create a test card with status "Digital" in MongoDB
2. `POST /api/dismantle` with valid userId + cardId
3. Verify: response contains `crystalReward`, `crystalBalance`, `status: "pending"`
4. Verify: card status in MongoDB is "Burned"
5. Verify: `crystal_balances` collection has the user's balance
6. Verify: transaction recorded with type "dismantled", status "pending"
7. Wait a few seconds, then verify transaction status updated to "confirmed" (via `after()` background)
8. Verify: `GET /api/crystal?userId=...` returns correct balance

- [ ] **Step 4: Manual UI test**

1. Navigate to Collection page with a Digital card
2. Verify "Dismantle" button appears (pink border, below Print button)
3. Click "Dismantle" — verify confirmation modal appears with Crystal reward amount
4. Confirm — verify card disappears from grid
5. Navigate to Profile — verify Crystal balance updated with correct amount
6. Search burned card by ID in Scan — verify it still shows with "Burned" status

- [ ] **Step 5: Commit verification evidence**

```bash
git add -A
git commit -m "chore: dismantle & crystal feature complete — all tests pass"
```
