---
feature: dismantle-crystal
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-08-28-dismantle-crystal.md
branch: feat/ai-anomaly-detection-oracle
commits: 6ed5643..4aa4820
---

# Dismantle & Crystal — Final Report

## What Was Built

A burn-to-earn system that allows users to permanently destroy ("dismantle") their Digital cards on-chain in exchange for Crystal — a new non-purchasable currency. Crystal can only be obtained through dismantling; there is no topup, purchase, or transfer mechanism. This replaces the previously planned buyback system with a cryptographically verifiable alternative: the burn is permanent on-chain (ERC1155 `_burn`), and the Crystal ledger lives in a separate MongoDB collection from Credits to prevent cross-currency contamination.

The feature spans the full stack: a new `burnCard()` function on the GachardCard smart contract (with 8 Foundry tests), a `POST /api/dismantle` endpoint with ownership/status/listing/fulfillment validation, a Crystal ledger library (`lib/crystal.ts`), a Dismantle button with explicit confirmation modal on CardItem, Crystal balance display on the Profile page, and automatic filtering of Burned cards from Collection and Profile grids. Burned cards remain searchable via Scan for provenance verification.

## Architecture

### Smart Contract

`burnCard(uint256 tokenId, address owner)` added to `contracts/src/GachardCard.sol`. Marked `onlyOwner` (backend calls on behalf of user, consistent with ADR-003 custodial model). Requires `cardStatus[tokenId] == Digital` and `balanceOf(owner, tokenId) == 1`. Calls OpenZeppelin `_burn(owner, tokenId, 1)` which destroys the token permanently. Emits `CardBurned(tokenId, owner, rarity)` with rarity included in the event for block explorer auditability.

The existing `_update()` override already blocks burns on Vaulted cards (since `_burn` calls `_update(owner, address(0))` and `from != address(0)` triggers the Vaulted revert), so no modification to `_update()` was needed.

**Known limitation:** After burn, `cardStatus(tokenId)` on-chain retains its last pre-burn value (Digital) — the token simply ceases to exist. The source of truth for "Burned" status is MongoDB (`cards.status === "Burned"`). Any future feature reading `cardStatus` directly from chain must cross-check via `balanceOf(owner, tokenId) == 0`.

### Crystal Ledger

`frontend/lib/crystal.ts` mirrors the structure of `credits.ts` but with no `deductCrystal` function (Crystal cannot be spent yet — trading is roadmap). Uses `crystal_balances` collection, separate from `credits`. Fixed dismantle rates: Common=20, Rare=50, Epic=120, Legendary=300 Crystal.

### API Endpoint

`POST /api/dismantle` at `frontend/app/api/dismantle/route.ts`. Validation chain:
1. userId + cardId/tokenId required
2. User exists (lookup by ObjectId)
3. Card exists (lookup by cardId, fallback to tokenId)
4. Ownership: `card.ownerAddress === user.walletAddress`
5. Status: `card.status === "Digital"`
6. Not listed: `card.isListed === false`
7. Not in fulfillment: `card.fulfillmentStatus === null`

On success: burns on-chain, records transaction as `"dismantled"` (pending), marks card as `"Burned"` in MongoDB (preserves document for provenance), credits Crystal, then confirms transaction in background via `after()` from `next/server` (same pattern as marketplace buy route). Response returns immediately with `"pending"` status.

`resolvedCardId` is derived from the query result (`card.cardId ?? card._id.toString()`), not from the request body, to prevent update-to-wrong-document when only tokenId is sent.

### UI

- **Dismantle button** on CardItem: appears only for `status === "Digital" && !isListed && tokenId !== null`. Pink border (`--aurora-pink`) to signal destructive action.
- **Confirmation modal**: follows exact Cancel Listing modal pattern. Shows Crystal reward amount. "This will permanently destroy this card on the blockchain and cannot be undone."
- **Crystal balance** on Profile: blue theme (`--electric-blue`, `#00CCFF`) with blue gradient background, visually distinct from Credit balance (gold). Static "Crystal" badge instead of "Top Up" link.
- **Burned card filtering**: `cards.filter(c => c.displayStatus !== "Burned")` applied in both Collection page and Profile card grid.

### Design Decisions

- **Separate `crystal_balances` collection** (not reusing `credits`): prevents accidental cross-currency operations. Crystal and Credits are fundamentally different — one is purchasable, the other is only earned through destruction.
- **Card status "Burned" in MongoDB (not deleted)**: preserves provenance. Burned cards can still be found via Scan by Card ID for transparency, consistent with the project's provenance philosophy.
- **`after()` for background confirmation** (not `Promise.race + setTimeout`): response returns immediately to the user; receipt polling happens in the background after the response is sent. Same pattern as marketplace buy route.
- **Honeypot-style dismantle rates**: rates are proportional to FVM price ranges (Common < Rare < Epic < Legendary), creating a natural incentive to dismantle less valuable cards while preserving rare ones.

## Usage

### Dismantling a Card

1. Navigate to Collection or Profile page
2. Find a Digital card (not Listed, not In Progress, not Real)
3. Click "Dismantle" button (pink border, below Print button)
4. Confirm in the modal — shows Crystal reward amount
5. Card disappears from grid, Crystal balance updates on Profile

### API

```
POST /api/dismantle
Body: { "userId": "...", "cardId": "...", "tokenId": 123 }
Response: { "status": "pending", "txId": "GC-...", "crystalReward": 50, "crystalBalance": 150, "rarity": "Rare" }
```

```
GET /api/crystal?userId=...
Response: { "balance": 150 }
```

### Dismantle Rates

| Rarity | Crystal |
|--------|---------|
| Common | 20 |
| Rare | 50 |
| Epic | 120 |
| Legendary | 300 |

## Verification

- **Foundry tests**: 54/54 pass (46 existing + 8 new burn tests). Tests cover: burn success (balance=0), cannot transfer after burn, event emission with correct rarity, revert when Vaulted, revert when not owner, revert when not holder, revert when already burned.
- **TypeScript**: `npx tsc --noEmit` passes with no errors.
- **Contract deployed**: New contract at `0x16df46a0c9ee8a5e82d53557e4aff373052b383f` on BSC Testnet.
- **Production deployed**: All code pushed and deployed to Vercel (`https://gachard.com`).

### Pending Verification

- Clean slate (including users) not yet executed — blocked by Vercel admin credential mismatch + Cloudflare caching of new API routes. Needs manual execution via MongoDB Atlas dashboard.
- Marketplace migration to Crystal (Trade uses Crystal instead of Credits) — documented as next step, not yet implemented.

## Journey Log

- [lesson] Vercel Deployment Protection (SSO) blocks all programmatic access to preview URLs. Production domain goes through Cloudflare which caches 404 responses for new routes — new API endpoints return 404 until Cloudflare cache expires, even though they're compiled and deployed.
- [lesson] Vercel env vars set via CLI don't propagate to already-deployed functions — requires a full redeploy. But even after redeploy, Cloudflare caching can mask the update.
- [lesson] The `_update()` override in GachardCard.sol already handles burn protection for Vaulted cards — no need to add special-case logic. `_burn()` → `_update(owner, address(0))` → Vaulted check fires because `from != address(0)`.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-08-28-dismantle-crystal.md` | Implementation plan | 11 tasks, complete |
| `contracts/src/GachardCard.sol` | Smart contract | burnCard() + CardBurned event |
| `contracts/test/GachardCard.t.sol` | Foundry tests | 8 new burn test cases |
| `frontend/lib/crystal.ts` | Crystal ledger | getCrystalBalance, addCrystal, DISMANTLE_RATES |
| `frontend/app/api/dismantle/route.ts` | Dismantle API | POST with full validation chain |
| `frontend/app/api/crystal/route.ts` | Crystal balance API | GET endpoint |
| `frontend/components/CardItem.tsx` | UI: Dismantle button + modal | Confirmation modal with Crystal reward |
| `frontend/app/profile/page.tsx` | UI: Crystal balance display | Blue theme, distinct from Credit |
| `frontend/app/collection/page.tsx` | UI: Burned card filtering | Excludes Burned from grid |
| `DECISIONS.md` | ADR-026 | Dismantle & Crystal decision record |
