# AI Anomaly Detection Oracle — Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/ai-anomaly-detection-oracle.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect wash-trading patterns in marketplace trades using deterministic signals + AI risk scoring, post results on-chain via `recordVerification()`, and exclude flagged transactions from FVM calculations.

**Architecture:** Deterministic signal extraction (repeatPairCount, priceDeviationPct, resaleSpeedHours) feeds into Gemini AI for risk scoring (0-100). Results are posted on-chain via a new `recordVerification()` function in GachardCard.sol (Oracle pattern). Flagged transactions are excluded from FVM to prevent price manipulation. All scoring happens post-transaction — it never blocks or reverses a completed trade.

**Tech Stack:** Solidity 0.8.24 (Foundry), Next.js API routes, ethers.js 6.17, MongoDB, Google Gemini API (`gemini-2.0-flash` via `@google/generative-ai`)

## Global Constraints

- Smart contract: solc 0.8.24, OpenZeppelin `Ownable`, BSC testnet
- AI model: `gemini-2.0-flash` via `@google/generative-ai` (same pattern as `market-insight.ts`)
- Risk scoring is post-transaction only — never blocks or cancels a trade
- `flagged` threshold: `riskScore >= 70` (configurable constant)
- Skip AI call for trivial cases (first transaction, no historical data) — return `{ riskScore: 0, flagged: false }`
- FVM exclusion: transactions with `flagged === true` are excluded from average calculation
- All amounts in Credit (integer cents)
- ADR numbering continues from ADR-024 → ADR-025

---

### Task 1: Smart Contract — Add `recordVerification()` to GachardCard.sol

**Covers:** Spec §1 (smart contract additions)

**Files:**
- Modify: `contracts/src/GachardCard.sol:23-27` (after `lastOwner` mapping, before events)

**Interfaces:**
- Produces: `recordVerification(uint256 tokenId, uint8 riskScore, bool flagged) external onlyOwner`
- Produces: `mapping(uint256 => uint8) public lastRiskScore`
- Produces: `mapping(uint256 => bool) public flaggedSuspicious`
- Produces: `event VerificationRecorded(uint256 indexed tokenId, uint8 riskScore, bool flagged)`

- [ ] **Step 1: Add mappings, event, and function to GachardCard.sol**

Add after line 23 (`mapping(uint256 => address) public lastOwner;`):

```solidity
    mapping(uint256 => uint8) public lastRiskScore;
    mapping(uint256 => bool) public flaggedSuspicious;
```

Add after line 27 (`event MarketplaceTransfer...`):

```solidity
    event VerificationRecorded(uint256 indexed tokenId, uint8 riskScore, bool flagged);
```

Add after `marketplaceTransfer()` function (after line 152), before `_update()`:

```solidity
    /**
     * @notice Catat hasil verifikasi risiko wash-trading untuk tokenId
     * @dev onlyOwner — backend yang memanggil setelah AI scoring
     * @param tokenId ID kartu yang diverifikasi
     * @param riskScore Skor risiko 0-100 (0=aman, 100=sangat mencurigakan)
     * @param flagged true jika riskScore >= threshold
     */
    function recordVerification(uint256 tokenId, uint8 riskScore, bool flagged) external onlyOwner {
        require(riskScore <= 100, "Risk score out of range");
        lastRiskScore[tokenId] = riskScore;
        flaggedSuspicious[tokenId] = flagged;
        emit VerificationRecorded(tokenId, riskScore, flagged);
    }
```

- [ ] **Step 2: Verify contract compiles**

Run: `cd contracts && forge build`
Expected: Compiles successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add contracts/src/GachardCard.sol
git commit -m "feat(contract): add recordVerification() for anomaly detection oracle"
```

---

### Task 2: Foundry Tests — `recordVerification()` Test Suite

**Covers:** Spec §2 (Foundry tests)

**Files:**
- Modify: `contracts/test/GachardCard.t.sol` (append new test section after line 421)

**Interfaces:**
- Consumes: `recordVerification()`, `lastRiskScore`, `flaggedSuspicious`, `VerificationRecorded` from Task 1

- [ ] **Step 1: Write failing tests for recordVerification**

Append to `contracts/test/GachardCard.t.sol` before the closing `}`:

```solidity
    // ==================== recordVerification tests ====================

    function test_recordVerification_stores_risk_score() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.recordVerification(tokenId, 75, true);

        assertEq(card.lastRiskScore(tokenId), 75);
    }

    function test_recordVerification_stores_flagged_true() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.recordVerification(tokenId, 85, true);

        assertTrue(card.flaggedSuspicious(tokenId));
    }

    function test_recordVerification_stores_flagged_false() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.recordVerification(tokenId, 20, false);

        assertFalse(card.flaggedSuspicious(tokenId));
    }

    function test_recordVerification_emits_event() public {
        uint256 tokenId = card.mintCard(user1, 0);

        vm.expectEmit(true, false, false, true);
        emit GachardCard.VerificationRecorded(tokenId, 75, true);
        card.recordVerification(tokenId, 75, true);
    }

    function test_recordVerification_reverts_when_not_owner() public {
        uint256 tokenId = card.mintCard(user1, 0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        card.recordVerification(tokenId, 50, false);
    }

    function test_recordVerification_reverts_on_score_above_100() public {
        uint256 tokenId = card.mintCard(user1, 0);

        vm.expectRevert("Risk score out of range");
        card.recordVerification(tokenId, 101, false);
    }

    function test_recordVerification_overwrites_previous_score() public {
        uint256 tokenId = card.mintCard(user1, 0);

        card.recordVerification(tokenId, 30, false);
        assertEq(card.lastRiskScore(tokenId), 30);
        assertFalse(card.flaggedSuspicious(tokenId));

        card.recordVerification(tokenId, 90, true);
        assertEq(card.lastRiskScore(tokenId), 90);
        assertTrue(card.flaggedSuspicious(tokenId));
    }

    function test_recordVerification_score_0_and_100_boundary() public {
        uint256 id1 = card.mintCard(user1, 0);
        uint256 id2 = card.mintCard(user1, 0);

        card.recordVerification(id1, 0, false);
        assertEq(card.lastRiskScore(id1), 0);
        assertFalse(card.flaggedSuspicious(id1));

        card.recordVerification(id2, 100, true);
        assertEq(card.lastRiskScore(id2), 100);
        assertTrue(card.flaggedSuspicious(id2));
    }
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_recordVerification -vvv`
Expected: All 8 tests PASS.

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `cd contracts && forge test -vvv`
Expected: All existing tests + new tests PASS.

- [ ] **Step 4: Commit**

```bash
git add contracts/test/GachardCard.t.sol
git commit -m "test(contract): add recordVerification() test suite (8 tests)"
```

---

### Task 3: Update blockchain.ts ABI + Add `recordVerification()` Wrapper

**Covers:** Spec §1 (frontend integration of new contract function)

**Files:**
- Modify: `frontend/lib/blockchain.ts:9-23` (ABI array) and after line 145 (new function)

**Interfaces:**
- Produces: `recordVerification(tokenId: number, riskScore: number, flagged: boolean): Promise<string>` — returns txHash
- Consumes: `recordVerification()` from GachardCard.sol (Task 1)

- [ ] **Step 1: Add recordVerification to ABI**

In `frontend/lib/blockchain.ts`, add to the `GACHARD_ABI` array (after line 22, before the closing `];`):

```typescript
  "function recordVerification(uint256 tokenId, uint8 riskScore, bool flagged) external",
  "function lastRiskScore(uint256 tokenId) external view returns (uint8)",
  "function flaggedSuspicious(uint256 tokenId) external view returns (bool)",
  "event VerificationRecorded(uint256 indexed tokenId, uint8 riskScore, bool flagged)",
```

- [ ] **Step 2: Add recordVerification wrapper function**

Add after the `getBalance` function (after line 145):

```typescript
export async function recordVerification(tokenId: number, riskScore: number, flagged: boolean): Promise<string> {
  const contract = getContract();
  const tx = await contract.recordVerification(tokenId, riskScore, flagged);
  return tx.hash;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/blockchain.ts
git commit -m "feat(blockchain): add recordVerification() ABI and wrapper"
```

---

### Task 4: Fraud Signal Detection — `frontend/lib/fraud-signals.ts`

**Covers:** Spec §4 (deterministic signal extraction)

**Files:**
- Create: `frontend/lib/fraud-signals.ts`

**Interfaces:**
- Produces: `calculateTradeSignals(tokenId, buyerWallet, sellerWallet, price, templateId): Promise<TradeSignals>`
- Produces: `TradeSignals { repeatPairCount: number; priceDeviationPct: number; resaleSpeedHours: number | null }`
- Consumes: MongoDB `transactions` collection (type: "sold")
- Consumes: `getFVM()` from `frontend/lib/fvm.ts`

- [ ] **Step 1: Create fraud-signals.ts**

```typescript
import { getCollection } from "./mongodb";
import { getFVM } from "./fvm";

export interface TradeSignals {
  repeatPairCount: number;
  priceDeviationPct: number;
  resaleSpeedHours: number | null;
}

export async function calculateTradeSignals(
  tokenId: number,
  buyerWallet: string,
  sellerWallet: string,
  price: number,
  templateId: string
): Promise<TradeSignals> {
  const txCol = await getCollection("transactions");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. repeatPairCount: how many times these two wallets traded (either direction) in 30 days
  const repeatPairCount = await txCol.countDocuments({
    type: "sold",
    status: "confirmed",
    createdAt: { $gte: thirtyDaysAgo },
    $or: [
      { fromAddress: sellerWallet, toAddress: buyerWallet },
      { fromAddress: buyerWallet, toAddress: sellerWallet },
    ],
  });

  // 2. priceDeviationPct: deviation from FVM
  const fvmResult = await getFVM(templateId);
  let priceDeviationPct = 0;
  if (fvmResult.fvm !== null && fvmResult.fvm > 0) {
    priceDeviationPct = Math.abs(((price - fvmResult.fvm) / fvmResult.fvm) * 100);
  }

  // 3. resaleSpeedHours: hours since seller acquired this card via a "sold" transaction
  let resaleSpeedHours: number | null = null;
  const sellerAcquisition = await txCol.findOne(
    { type: "sold", status: "confirmed", tokenId, toAddress: sellerWallet },
    { sort: { createdAt: -1 } }
  );
  if (sellerAcquisition) {
    const acquiredAt = new Date(sellerAcquisition.createdAt).getTime();
    resaleSpeedHours = (Date.now() - acquiredAt) / (1000 * 60 * 60);
  }

  return { repeatPairCount, priceDeviationPct, resaleSpeedHours };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/fraud-signals.ts
git commit -m "feat(lib): add deterministic fraud signal extraction"
```

---

### Task 5: AI Risk Scoring — `frontend/lib/risk-score.ts`

**Covers:** Spec §5 (AI risk scoring via Gemini)

**Files:**
- Create: `frontend/lib/risk-score.ts`

**Interfaces:**
- Produces: `calculateRiskScore(signals: TradeSignals): Promise<RiskResult>`
- Produces: `RiskResult { riskScore: number; flagged: boolean; reasoning: string }`
- Consumes: `TradeSignals` from Task 4
- Consumes: Gemini API via same pattern as `market-insight.ts`

- [ ] **Step 1: Create risk-score.ts**

```typescript
import { TradeSignals } from "./fraud-signals";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const FLAGGED_THRESHOLD = 70;

export interface RiskResult {
  riskScore: number;
  flagged: boolean;
  reasoning: string;
}

export async function calculateRiskScore(signals: TradeSignals): Promise<RiskResult> {
  // Skip AI for trivial cases — no meaningful data
  if (
    signals.repeatPairCount === 0 &&
    signals.priceDeviationPct < 5 &&
    signals.resaleSpeedHours === null
  ) {
    return { riskScore: 0, flagged: false, reasoning: "No suspicious signals detected" };
  }

  const resaleInfo =
    signals.resaleSpeedHours !== null
      ? `${Math.round(signals.resaleSpeedHours)} jam`
      : "tidak diketahui (seller bukan dari pembelian marketplace)";

  const prompt = `Berdasarkan sinyal transaksi kartu koleksi berikut: pasangan wallet ini sudah bertransaksi ${signals.repeatPairCount} kali dalam 30 hari, harga menyimpang ${signals.priceDeviationPct.toFixed(1)}% dari nilai pasar wajar, kartu dijual ulang ${resaleInfo} setelah dibeli. Berikan skor risiko wash-trading 0-100 (0=aman, 100=sangat mencurigakan) dan alasan singkat 1 kalimat. Return JSON: {"riskScore": number, "reasoning": string}`;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { riskScore: 0, flagged: false, reasoning: "AI response parsing failed" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.max(0, Math.min(100, Math.round(parsed.riskScore || 0)));
    const reasoning = String(parsed.reasoning || "No reasoning provided");

    return {
      riskScore: score,
      flagged: score >= FLAGGED_THRESHOLD,
      reasoning,
    };
  } catch (err) {
    console.error("[risk-score] Gemini call failed:", err);
    return { riskScore: 0, flagged: false, reasoning: "AI scoring unavailable" };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/risk-score.ts
git commit -m "feat(lib): add AI risk scoring via Gemini for wash-trading detection"
```

---

### Task 6: Integrate Risk Scoring into Buy Route

**Covers:** Spec §6 (integration into buy flow)

**Files:**
- Modify: `frontend/app/api/marketplace/listings/[id]/buy/route.ts:1-6` (imports) and after line 110 (after sold transaction insert)

**Interfaces:**
- Consumes: `calculateTradeSignals()` from Task 4
- Consumes: `calculateRiskScore()` from Task 5
- Consumes: `recordVerification()` from Task 3
- Consumes: MongoDB `transactions` collection (update with riskScore, flagged, riskReasoning)

- [ ] **Step 1: Add imports to buy route**

Add to imports in `frontend/app/api/marketplace/listings/[id]/buy/route.ts` (after line 6):

```typescript
import { after } from "next/server";
import { calculateTradeSignals } from "@/lib/fraud-signals";
import { calculateRiskScore } from "@/lib/risk-score";
import { recordVerification } from "@/lib/blockchain";
```

- [ ] **Step 2: Capture insertedId from the sold transaction insert**

Change the sold transaction `insertOne` call (lines 91-110) to capture its result:

```typescript
    const soldTxResult = await txCol.insertOne({
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
    });
```

- [ ] **Step 3: Add post-transaction risk scoring using `after()` and `insertedId`**

After the sold transaction insert (after the `soldTxResult` assignment), before the "listed" transaction insert, add:

```typescript
    // Post-transaction risk scoring via after() — platform keeps function alive until complete
    after(async () => {
      try {
        const signals = await calculateTradeSignals(
          listing.tokenId,
          buyer.walletAddress,
          listing.sellerWalletAddress,
          listing.price,
          listing.templateId
        );
        const risk = await calculateRiskScore(signals);

        // Update the exact sold transaction by its _id — no time-window guessing
        await txCol.updateOne(
          { _id: soldTxResult.insertedId },
          { $set: { riskScore: risk.riskScore, flagged: risk.flagged, riskReasoning: risk.reasoning } }
        );

        // Post to on-chain oracle
        try {
          await recordVerification(listing.tokenId, risk.riskScore, risk.flagged);
        } catch (err) {
          console.error("[marketplace/buy] on-chain recordVerification failed:", err);
        }
      } catch (err) {
        console.error("[marketplace/buy] risk scoring failed:", err);
      }
    });
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/api/marketplace/listings/\[id\]/buy/route.ts
git commit -m "feat(buy): integrate post-transaction risk scoring and on-chain oracle"
```

---

### Task 7: Update FVM to Exclude Flagged Transactions

**Covers:** Spec §7 (FVM exclusion)

**Files:**
- Modify: `frontend/lib/fvm.ts:12-14` (Level 1 query) and `frontend/lib/fvm.ts:28-30` (Level 2 query)

**Interfaces:**
- Modifies: `getFVM(templateId)` — adds `flagged: { $ne: true }` filter to both queries

- [ ] **Step 1: Add flagged exclusion to Level 1 query**

In `frontend/lib/fvm.ts`, change line 13 from:

```typescript
    .find({ type: "sold", templateId, status: "confirmed" })
```

to:

```typescript
    .find({ type: "sold", templateId, status: "confirmed", flagged: { $ne: true } })
```

- [ ] **Step 2: Add flagged exclusion to Level 2 query**

Change line 29 from:

```typescript
    .find({ type: "sold", rarity: template.rarity, status: "confirmed" })
```

to:

```typescript
    .find({ type: "sold", rarity: template.rarity, status: "confirmed", flagged: { $ne: true } })
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/fvm.ts
git commit -m "feat(fvm): exclude flagged transactions from FVM calculation"
```

---

### Task 8: Seed Data — Wash-Trading Demo Case

**Covers:** Spec §8 (seed data for demo)

**Files:**
- Modify: `frontend/scripts/seed-marketplace.ts` (append after independent transactions section, before the insertMany on line 197)

**Interfaces:**
- Produces: 3 "sold" transactions with hardcoded riskScore, flagged, riskReasoning
- Uses: 2 existing demo users (users[0] and users[1]), 1 Rare card

- [ ] **Step 1: Add wash-trading seed data to seed script**

In `frontend/scripts/seed-marketplace.ts`, add before the `// Insert all` comment (before line 196):

```typescript
  // === WASH-TRADING DEMO CASE ===
  // 3 rapid trades between same 2 wallets, escalating prices
  const washCard = cardsByRarity.get(1)?.[1] || cardsByRarity.get(1)?.[0] || cards[3];
  const washUserA = users[0];
  const washUserB = users[1];
  const washPrices = [300, 600, 1200];
  const washRiskScores = [45, 72, 92];

  for (let i = 0; i < 3; i++) {
    const fromUser = i % 2 === 0 ? washUserA : washUserB;
    const toUser = i % 2 === 0 ? washUserB : washUserA;
    const daysBack = 5 - i; // 5, 4, 3 days ago — rapid succession

    transactions.push({
      _id: new ObjectId(),
      userId: toUser._id.toString(),
      type: "sold",
      tokenId: washCard.tokenId,
      tokenIds: [washCard.tokenId],
      rarity: washCard.rarity ?? 1,
      rarities: [washCard.rarity ?? 1],
      templateIds: [washCard.templateId],
      amount: washPrices[i],
      purchasePrice: washPrices[i],
      txHash: null,
      status: "confirmed",
      contractAddress: CONTRACT_ADDRESS,
      fromAddress: fromUser.walletAddress || "0x0000000000000000000000000000000000000000",
      toAddress: toUser.walletAddress || "0x0000000000000000000000000000000000000000",
      error: "",
      createdAt: pastDate(daysBack),
      updatedAt: pastDate(daysBack),
      riskScore: washRiskScores[i],
      flagged: washRiskScores[i] >= 70,
      riskReasoning: washRiskScores[i] >= 70
        ? "Pola wash-trading terdeteksi: pasangan wallet yang sama berulang kali dengan harga meningkat tajam"
        : "Transaksi awal dalam pola yang baru terbentuk",
    });
  }
  console.log(`Wash-trading demo: 3 trades on ${washCard.cardId} between ${washUserA.username} and ${washUserB.username}`);
```

- [ ] **Step 2: Verify script compiles**

Run: `cd frontend && npx tsx --eval "console.log('TypeScript OK')"`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/scripts/seed-marketplace.ts
git commit -m "feat(seed): add wash-trading demo case with hardcoded risk scores"
```

---

### Task 9: Admin UI — Risk Column in Transactions Tab

**Covers:** Spec §9 (admin UI risk display)

**Files:**
- Modify: `frontend/app/api/admin/transactions/route.ts:15-30` (add risk fields to response)
- Modify: `frontend/app/admin/page.tsx:14-29` (AdminTx type) and `frontend/app/admin/page.tsx:342-371` (TxsTable component)

**Interfaces:**
- Modifies: Admin API response to include `riskScore`, `flagged`, `riskReasoning`
- Modifies: `AdminTx` type to include risk fields
- Modifies: `TxsTable` to render Risk column with color-coded badge

- [ ] **Step 1: Update admin transactions API to include risk fields**

In `frontend/app/api/admin/transactions/route.ts`, update the `result` mapping (line 15-30) to include risk fields:

```typescript
    const result = txs.map((tx) => ({
      id: generateInvoiceId(tx._id.toString()),
      rawId: tx._id.toString(),
      txHash: tx.txHash || null,
      status: friendlyTxStatus(tx.status),
      rawStatus: tx.status,
      type: tx.type,
      tokenId: tx.tokenId ?? null,
      tokenIds: tx.tokenIds ?? null,
      userId: tx.userId,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      error: tx.error ?? null,
      riskScore: tx.riskScore ?? null,
      flagged: tx.flagged ?? false,
      riskReasoning: tx.riskReasoning ?? null,
    }));
```

- [ ] **Step 2: Update AdminTx type in admin page**

In `frontend/app/admin/page.tsx`, update the `AdminTx` type (lines 14-29) to add risk fields:

```typescript
type AdminTx = {
  id: string;
  rawId: string;
  txHash: string | null;
  status: string;
  rawStatus: string;
  type: string;
  tokenId: number | null;
  tokenIds: number[] | null;
  userId: string;
  fromAddress: string;
  toAddress: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  riskScore: number | null;
  flagged: boolean;
  riskReasoning: string | null;
};
```

- [ ] **Step 3: Update TxsTable to render Risk column**

Replace the `TxsTable` component (lines 342-371) with:

```typescript
function TxsTable({ txs }: { txs: AdminTx[] }) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  return (
    <TableShell head={<><TH>Invoice ID</TH><TH>txHash</TH><TH>Status</TH><TH>Type</TH><TH>Risk</TH><TH>Timestamp</TH></>}>
      {txs.length === 0 ? (
        <tr><td colSpan={6} className="p-8 text-center text-white/40">No transactions found</td></tr>
      ) : (
        txs.map((tx) => (
          <>
            <tr key={tx.rawId} style={rowStyle} className="hover:bg-white/[0.03] transition-colors">
              <td className="px-4 py-3.5">
                <div className="font-mono text-xs text-white/90">{tx.id}</div>
                <div className="text-[0.6rem] text-white/35 font-mono">{tx.rawId}</div>
              </td>
              <td className="px-4 py-3.5 font-mono text-xs">
                {tx.txHash ? (
                  <a href={`${BSC_TESTNET_TX}${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--electric-blue)" }} className="hover:underline">
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                  </a>
                ) : <span className="text-white/30">—</span>}
              </td>
              <td className="px-4 py-3.5">
                <StatusPill status={tx.status} rgb={tx.rawStatus === "confirmed" ? "0,204,255" : tx.rawStatus === "failed" ? "255,107,186" : "255,196,102"} />
              </td>
              <td className="px-4 py-3.5 capitalize text-white/80">{tx.type}</td>
              <td className="px-4 py-3.5">
                {tx.riskScore !== null ? (
                  <button
                    onClick={() => setExpandedTx(expandedTx === tx.rawId ? null : tx.rawId)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tx.riskScore >= 70 ? "rgba(255,107,186,0.15)" : tx.riskScore >= 30 ? "rgba(255,196,102,0.15)" : "rgba(0,255,136,0.15)",
                        color: tx.riskScore >= 70 ? "rgb(255,107,186)" : tx.riskScore >= 30 ? "rgb(255,196,102)" : "rgb(0,255,136)",
                      }}
                    >
                      {tx.riskScore}
                    </span>
                    {tx.flagged && <span title="Flagged suspicious">🚩</span>}
                  </button>
                ) : (
                  <span className="text-white/20 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-white/50">{new Date(tx.createdAt).toLocaleString()}</td>
            </tr>
            {expandedTx === tx.rawId && tx.riskReasoning && (
              <tr key={`${tx.rawId}-detail`}>
                <td colSpan={6} className="px-4 py-2 text-xs text-white/60" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <span className="text-white/40">Risk reasoning:</span> {tx.riskReasoning}
                </td>
              </tr>
            )}
          </>
        ))
      )}
    </TableShell>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/api/admin/transactions/route.ts frontend/app/admin/page.tsx
git commit -m "feat(admin): add risk score column with badge and reasoning tooltip"
```

---

### Task 10: ADR-025 — Document AI Anomaly Detection Oracle

**Covers:** Spec §10 (ADR documentation)

**Files:**
- Modify: `DECISIONS.md` (append after ADR-024, line 139)

**Interfaces:**
- None (documentation only)

- [ ] **Step 1: Append ADR-025 to DECISIONS.md**

Append to `DECISIONS.md` after line 139:

```markdown

## ADR-025: AI Anomaly Detection Oracle untuk Trade
**Status**: Accepted
**Decision**: Deteksi pola wash-trading pada transaksi marketplace menggunakan pendekatan Oracle:
1. **Sinyal deterministik** (`fraud-signals.ts`): `repeatPairCount` (frekuensi pasangan wallet), `priceDeviationPct` (penyimpangan harga dari FVM), `resaleSpeedHours` (kecepatan resale).
2. **AI risk scoring** (`risk-score.ts`): Gemini mensintesis ketiga sinyal jadi skor 0-100. Threshold `flagged = riskScore >= 70`.
3. **On-chain Oracle** (`recordVerification()`): Hasil skor dan flag di-post ke smart contract, tercatat permanen di blockchain.
4. **FVM exclusion**: Transaksi dengan `flagged === true` dikecualikan dari perhitungan FVM untuk mencegah manipulasi harga.
5. **Non-blocking**: Semua scoring terjadi SETELAH transaksi selesai — tidak pernah memblokir atau membatalkan trade.
**Reason**: Wash-trading (A jual ke B, B jual balik ke A dengan harga naik) mengancam integritas FVM dan ekonomi marketplace. Oracle pattern memastikan hasil verifikasi transparan dan teraudit di on-chain, bukan hanya di database backend.
```

- [ ] **Step 2: Commit**

```bash
git add DECISIONS.md
git commit -m "docs: add ADR-025 for AI Anomaly Detection Oracle"
```

---

## Execution Order & Dependencies

```
Task 1 (Smart Contract)
  └─→ Task 2 (Foundry Tests) — depends on Task 1
       └─→ Task 3 (blockchain.ts ABI) — depends on Task 1

Task 4 (fraud-signals.ts) — independent
Task 5 (risk-score.ts) — depends on Task 4 (imports TradeSignals type)

Task 6 (Buy Route Integration) — depends on Tasks 3, 4, 5
Task 7 (FVM Exclusion) — independent
Task 8 (Seed Data) — independent
Task 9 (Admin UI) — independent
Task 10 (ADR) — independent

Parallelizable: Tasks 1+4+7+8+9+10 can start immediately.
Sequential chain: 1 → 2 → 3, 4 → 5 → 6.
```

## Verification Checklist

After all tasks complete:
1. `cd contracts && forge test -vvv` — all tests pass (including 8 new recordVerification tests)
2. `cd frontend && npx tsc --noEmit` — no TypeScript errors
3. `cd frontend && npx tsx scripts/seed-marketplace.ts` — seed runs, wash-trading case appears with riskScore/flagged fields
4. Admin Transactions tab shows Risk column with color-coded badges
5. Buy a card → verify risk scoring runs (check server logs) and transaction record includes riskScore/flagged/riskReasoning
