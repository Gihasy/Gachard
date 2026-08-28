---
feature: ai-anomaly-detection-oracle
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-08-21-ai-anomaly-detection-oracle.md
branch: feat/ai-anomaly-detection-oracle
commits: 3b7d835..c5530fc
---

# AI Anomaly Detection Oracle — Final Report

## What Was Built

Post-transaction wash-trading detection system for the Gachard marketplace. When a card is bought, three deterministic signals (repeatPairCount, priceDeviationPct, resaleSpeedHours) are extracted from transaction history, scored by MiMo V2.5 Pro AI (0-100), and posted on-chain via a new `recordVerification()` smart contract function. Flagged transactions (riskScore >= 70) are excluded from FVM (Fair Value Market) calculations to prevent price manipulation.

The system runs entirely in background via Next.js `after()` — it never blocks or reverses a completed trade. Admin UI shows a color-coded Risk column in the Transactions tab with expandable reasoning.

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
| Fraud Signals | `frontend/lib/fraud-signals.ts` | Deterministic signal extraction from MongoDB transactions |
| Risk Score | `frontend/lib/risk-score.ts` | MiMo V2.5 Pro AI scoring via OpenAI-compatible API |
| Blockchain | `frontend/lib/blockchain.ts` | ABI entries + `recordVerification()` wrapper |
| Buy Route | `frontend/app/api/marketplace/listings/[id]/buy/route.ts` | Integration point — `after()` + `insertedId` pattern |
| FVM | `frontend/lib/fvm.ts` | `flagged: { $ne: true }` filter on both Level 1 and Level 2 queries |
| Admin UI | `frontend/app/admin/page.tsx` | Risk column with color-coded badge (green/yellow/red) + expandable reasoning |
| Seed Data | `frontend/scripts/seed-marketplace.ts` + `frontend/app/api/seed-marketplace/route.ts` | 3 wash-trading demo transactions with hardcoded risk scores |

### Design Decisions

- **`after()` instead of IIFE fire-and-forget**: Next.js 16.2.11 supports `after()` from `next/server`, which guarantees the platform keeps the function alive until the callback completes. Previous IIFE pattern risked being cut mid-execution on serverless freeze.

- **`insertedId` instead of time-window query**: The sold transaction's `_id` is captured from `insertOne()` and used directly for the risk-score update (`{ _id: soldTxResult.insertedId }`). This eliminates the fragile `tokenId + type + createdAt >= now-5s` pattern that could match the wrong transaction if the same card sold twice quickly.

- **`tokenId: number` parameter instead of regex extraction**: `calculateTradeSignals()` accepts `tokenId` directly from the card record. The previous `cardId.replace(/\D/g, "")` regex would produce incorrect results since `cardId` is now a hex string, not a numeric ID.

- **MiMo V2.5 Pro over Gemini**: Replaced `@google/generative-ai` SDK with native `fetch` to OpenAI-compatible endpoint (`https://token-plan-sgp.xiaomimimo.com/v1`). No additional SDK dependency. `GEMINI_API_KEY` retained for `market-insight.ts` which still uses it.

- **Rule-based alternative noted**: The three deterministic signals are simple enough for threshold-based scoring (0ms, free, deterministic). AI adds value for edge cases and natural-language reasoning but is not strictly necessary.

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

### Seed Data

Run via API: `POST /api/seed-marketplace?token=<ENCRYPTION_SECRET_KEY>`

Creates 3 wash-trading demo transactions between 2 wallets with escalating prices (300 → 600 → 1200 Credit) and risk scores (45, 72, 92). The last 2 are flagged.

### Admin UI

Navigate to `/admin` → Transactions tab. New "Risk" column shows:
- Green badge (score < 30): low risk
- Yellow badge (30-69): medium risk
- Red badge (>= 70): flagged suspicious with flag icon
- Click badge to expand AI reasoning

## Verification

| Check | Result |
|-------|--------|
| `forge test` (full suite) | 46/46 PASS (38 existing + 8 new recordVerification tests) |
| `npx tsc --noEmit` | 0 errors |
| Vercel production build | Clean — 44 routes, TypeScript clean |
| Seed data in admin | 3 wash-trading txs visible with riskScore 45/72/92, flagged correctly |
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
- [pivot] Started with Gemini AI for risk scoring — migrated to MiMo V2.5 Pro (OpenAI-compatible API) per user preference; noted that rule-based scoring would suffice for 3 numeric signals
- [lesson] Contract redeployment creates a new address with empty state — all existing tokens and state are lost. Consider proxy pattern for future upgrades.

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
| `frontend/app/admin/page.tsx` | Admin UI | Risk column with badge |
| `frontend/app/api/admin/transactions/route.ts` | Admin API | Added risk fields |
| `frontend/scripts/seed-marketplace.ts` | CLI seed | Wash-trading demo data |
| `frontend/app/api/seed-marketplace/route.ts` | API seed | Wash-trading demo data |
| `DECISIONS.md` | ADR | ADR-025 added |
