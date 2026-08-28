---
feature: ai-anomaly-detection-oracle
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-08-21-ai-anomaly-detection-oracle.md
branch: feat/ai-anomaly-detection-oracle
commits: 3b7d835..373d556
---

# AI Anomaly Detection Oracle — Final Report

## What Was Built

Post-transaction wash-trading detection system for the Gachard marketplace. When a card is bought, three deterministic signals (repeatPairCount, priceDeviationPct, resaleSpeedHours) are extracted from transaction history, scored by MiMo V2.5 Pro AI (0-100), and posted on-chain via a new `recordVerification()` smart contract function. Flagged transactions (riskScore >= 70) are excluded from FVM (Fair Value Market) calculations to prevent price manipulation.

The system runs entirely in background via Next.js `after()` — it never blocks or reverses a completed trade. Admin UI shows a color-coded Risk column in the Transactions tab with expandable reasoning, plus type and risk filters. Cards tab shows tokenId with copy and BSCScan link icons. All demo data executes real on-chain transactions with verifiable txHash.

## Architecture

### Data Flow

```
Buy Transaction
  ├─ Insert sold tx → capture insertedId
  └─ after() {
       1. calculateTradeSignals(tokenId, buyer, seller, price, templateId)
          → repeatPairCount (30d wallet pair frequency)
          → priceDeviationPct (% deviation from FVM)
          → resaleSpeedHours (hours since seller acquired card)
       2. calculateRiskScore(signals) → MiMo V2.5 Pro → { riskScore, flagged, reasoning }
       3. Update tx by _id: insertedId (no time-window query)
       4. recordVerification(tokenId, riskScore, flagged) → on-chain
     }
```

### Components

| Component | File | Role |
|-----------|------|------|
| Smart Contract | `contracts/src/GachardCard.sol` | `recordVerification()`, `lastRiskScore`, `flaggedSuspicious` mappings, `VerificationRecorded` event |
| Foundry Tests | `contracts/test/GachardCard.t.sol` | 8 new tests for recordVerification |
| Fraud Signals | `frontend/lib/fraud-signals.ts` | Deterministic signal extraction from MongoDB transactions |
| Risk Score | `frontend/lib/risk-score.ts` | MiMo V2.5 Pro AI scoring via OpenAI-compatible API |
| Blockchain | `frontend/lib/blockchain.ts` | ABI entries + `recordVerification()` wrapper |
| Buy Route | `frontend/app/api/marketplace/listings/[id]/buy/route.ts` | Integration point — `after()` + `insertedId` pattern |
| FVM | `frontend/lib/fvm.ts` | `flagged: { $ne: true }` filter on both Level 1 and Level 2 queries |
| Admin UI | `frontend/app/admin/page.tsx` | Risk column, type/risk filters, tokenId with copy+BSCScan icons |
| Admin API | `frontend/app/api/admin/transactions/route.ts` | Added riskScore, flagged, riskReasoning fields |
| Seed (CLI) | `frontend/scripts/seed-marketplace.ts` | Real on-chain mint+transfer with txHash |
| Seed (API) | `frontend/app/api/seed-marketplace/route.ts` | DB-only seed with wash-trading demo data |
| Seed (On-chain) | `frontend/app/api/seed-onchain/route.ts` | Batched on-chain seed via API (wash, chain1, chain2, chain3) |
| Clean Slate | `frontend/app/api/admin/clean-slate/route.ts` | Added `?includeUsers=true` option |
| ADR | `DECISIONS.md` | ADR-025: AI Anomaly Detection Oracle |

### Design Decisions

- **`after()` instead of IIFE fire-and-forget**: Next.js 16.2.11 supports `after()` from `next/server`, which guarantees the platform keeps the function alive until the callback completes. Previous IIFE pattern risked being cut mid-execution on serverless freeze.

- **`insertedId` instead of time-window query**: The sold transaction's `_id` is captured from `insertOne()` and used directly for the risk-score update (`{ _id: soldTxResult.insertedId }`). This eliminates the fragile `tokenId + type + createdAt >= now-5s` pattern that could match the wrong transaction if the same card sold twice quickly.

- **`tokenId: number` parameter instead of regex extraction**: `calculateTradeSignals()` accepts `tokenId` directly from the card record. The previous `cardId.replace(/\D/g, "")` regex would produce incorrect results since `cardId` is now a hex string, not a numeric ID.

- **MiMo V2.5 Pro over Gemini**: Replaced `@google/generative-ai` SDK with native `fetch` to OpenAI-compatible endpoint (`https://token-plan-sgp.xiaomimimo.com/v1`). No additional SDK dependency. `GEMINI_API_KEY` retained for `market-insight.ts` which still uses it.

- **Batched on-chain seed**: Vercel serverless timeout (~60s) is too short for 55+ on-chain transactions. Seed endpoint split into batches (`wash`, `chain1`, `chain2`, `chain3`) that each complete within timeout. CLI script available for full local seed.

- **One contract, multiple tokenIds**: All cards share one GachardCard contract address. Each card gets a unique `tokenId` via `nextTokenId++`. Industry standard for ERC-1155 — gas efficient, marketplace compatible, batch operations supported.

## Usage

### Environment Variables

```
MIMO_API_KEY=<xiaomi-mimo-platform-token>
MIMO_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
MIMO_MODEL=MiMo-V2.5-Pro
CONTRACT_ADDRESS=0x56390137c171b3167D4055d199DA8Bc8eCeE219c
```

### Smart Contract

New contract deployed to BSC testnet at `0x56390137c171b3167D4055d199DA8Bc8eCeE219c` (tx: `0xe12cf496f53636d71f7efd9642caffb68f029e536c371dd1b69a4761ef863b34`).

Functions:
- `recordVerification(uint256 tokenId, uint8 riskScore, bool flagged)` — onlyOwner
- `lastRiskScore(uint256 tokenId) → uint8` — view
- `flaggedSuspicious(uint256 tokenId) → bool` — view

### Seed Commands

```bash
# DB-only seed (fast, no on-chain)
POST /api/seed-marketplace?token=<ENCRYPTION_SECRET_KEY>

# On-chain seed (real txHash, batched)
POST /api/seed-onchain?token=<SECRET>&batch=clear     # Clear old data
POST /api/seed-onchain?token=<SECRET>&batch=wash       # Wash-trading demo (3 tx)
POST /api/seed-onchain?token=<SECRET>&batch=chain1     # Legendary chain (5 tx)
POST /api/seed-onchain?token=<SECRET>&batch=chain2     # Epic chain (4 tx)
POST /api/seed-onchain?token=<SECRET>&batch=chain3     # Rare chain (3 tx)

# Clean slate
POST /api/admin/clean-slate                    # Preserve users
POST /api/admin/clean-slate?includeUsers=true  # Delete users too
```

### Admin UI

**Transactions tab:**
- Risk column with color-coded badge (green < 30, yellow 30-69, red >= 70)
- Click badge to expand AI reasoning
- Type filter: All, sold, listed, mint, topup, etc.
- Risk filter: All, Flagged, High (>=70), Medium (30-69), Low (<30), No Score

**Cards tab:**
- Token ID column with copy icon (copies `contractAddress?a=tokenId`)
- External link icon opens BSCScan directly

### Card Identity on Blockchain

```
Contract: 0x56390137c171b3167D4055d199DA8Bc8eCeE219c (shared by all cards)
Token ID: 4, 5, 6, 7... (unique per card, auto-increment)
BSCScan:  https://testnet.bscscan.com/token/<contract>?a=<tokenId>
```

## Verification

| Check | Result |
|-------|--------|
| `forge test` (full suite) | 46/46 PASS (38 existing + 8 new recordVerification tests) |
| `npx tsc --noEmit` | 0 errors |
| Vercel production build | Clean — 45 routes, TypeScript clean |
| On-chain seed | 15/15 sold transactions with real txHash |
| Admin Risk column | 3 wash-trading txs visible with riskScore 45/72/92 |
| Admin filters | Type and Risk filters working, counter shows filtered/total |
| Cards tab | tokenId with copy+BSCScan icons functional |
| Clean slate | 141 documents deleted (including 21 users), card_templates preserved |
| Contract deployment | Verified on BSC testnet |

### Test Coverage (Smart Contract)

8 new tests for `recordVerification()`:
- Stores risk score and flagged status
- Emits `VerificationRecorded` event
- Reverts when not owner
- Reverts on score > 100
- Overwrites previous score
- Boundary tests (0 and 100)

## Journey Log

- [pivot] Initial plan used IIFE fire-and-forget for background scoring — replaced with `after()` after recognizing serverless freeze risk from prior timeout issues
- [pivot] Original `calculateTradeSignals()` extracted tokenId from cardId via regex (`cardId.replace(/\D/g, "")`) — broke when cardId became hex; changed to accept `tokenId: number` directly
- [pivot] Risk-score update used time-window query (`createdAt >= now-5s`) — replaced with `insertedId` from `insertOne()` to eliminate wrong-match risk on fast consecutive sales
- [pivot] Started with Gemini AI for risk scoring — migrated to MiMo V2.5 Pro (OpenAI-compatible API) per user preference
- [pivot] Seed data had null txHash — modified to execute real on-chain `mintCard()` + `marketplaceTransfer()` for every demo transaction
- [pivot] Full on-chain seed timed out on Vercel (55+ txs > 60s) — split into batched API endpoint (`wash`, `chain1`, `chain2`, `chain3`)
- [lesson] Contract redeployment creates a new address with empty state — all existing tokens and state are lost. Consider proxy pattern for future upgrades.
- [lesson] MongoDB Atlas IP whitelist blocks local CLI scripts — use API endpoints on Vercel for database operations, or whitelist local IP

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-08-21-ai-anomaly-detection-oracle.md` | Implementation plan | 10 tasks, all completed |
| `contracts/src/GachardCard.sol` | Smart contract | Added recordVerification + mappings + event |
| `contracts/test/GachardCard.t.sol` | Foundry tests | 8 new tests |
| `frontend/lib/fraud-signals.ts` | Signal extraction | New file |
| `frontend/lib/risk-score.ts` | AI scoring | New file, MiMo V2.5 Pro |
| `frontend/lib/blockchain.ts` | ABI + wrapper | Added recordVerification |
| `frontend/lib/fvm.ts` | FVM calculation | Added flagged exclusion |
| `frontend/app/api/marketplace/listings/[id]/buy/route.ts` | Buy route | after() + insertedId integration |
| `frontend/app/admin/page.tsx` | Admin UI | Risk column, filters, tokenId icons |
| `frontend/app/api/admin/transactions/route.ts` | Admin API | Added risk fields |
| `frontend/app/api/admin/clean-slate/route.ts` | Clean slate | Added includeUsers option |
| `frontend/scripts/seed-marketplace.ts` | CLI seed | Real on-chain mint+transfer |
| `frontend/app/api/seed-marketplace/route.ts` | API seed | DB-only with wash-trading demo |
| `frontend/app/api/seed-onchain/route.ts` | On-chain seed | Batched API for real txHash |
| `DECISIONS.md` | ADR | ADR-025 added |
