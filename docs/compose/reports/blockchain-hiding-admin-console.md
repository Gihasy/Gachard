---
feature: blockchain-term-hiding-and-admin-console
status: delivered
specs: []
plans: []
branch: main
commits: pending
---

# Blockchain Term Hiding + Admin Console — Final Report

## What Was Built

Two-part feature that fully abstracts blockchain internals from end-users while providing developers with a read-only admin console.

**Part A — Blockchain Abstraction:** All user-facing API responses have been sanitized to remove raw blockchain identifiers (`txHash`) and internal status codes. Transaction IDs now display as human-friendly invoice numbers (`GC-20260727-a3f1`) instead of MongoDB ObjectId strings. Status labels use plain English (`Processing`, `Success`, `Failed`) instead of internal codes (`pending`, `confirmed`, `failed`). Card statuses use intuitive terms (`Ready`, `Printed`) instead of domain jargon (`Digital`, `Vaulted`).

**Part B — Admin Console:** A password-protected developer dashboard at `/admin` displays all database records (users, transactions, cards) with full technical details including wallet addresses, raw txHash with BscScan links, and internal status codes. Access is gated by HTTP Basic Auth with credentials stored in environment variables.

## Architecture

### Data Flow — User-Facing

```
Client → API Route → lib/status-map.ts + lib/invoice.ts → Sanitized Response
                         ↓
                   MongoDB (txHash stored internally, never exposed)
```

### Data Flow — Admin

```
Browser → /admin/* → middleware.ts (Basic Auth check) → /api/admin/* → MongoDB (full data)
```

### Key Files

| File | Responsibility |
|------|---------------|
| `lib/invoice.ts` | `generateInvoiceId(objectId)` — converts MongoDB ObjectId to `GC-YYYYMMDD-XXXX` format |
| `lib/status-map.ts` | `friendlyTxStatus()` + `friendlyCardStatus()` — maps internal codes to user-friendly labels |
| `lib/transactions.ts` | `getTransactionStatus()` — returns sanitized response (no txHash, invoice ID, friendly status) |
| `middleware.ts` | HTTP Basic Auth guard for `/admin/*` routes |
| `app/admin/page.tsx` | Admin dashboard UI (3 tabs: Users, Transactions, Cards) |
| `app/api/admin/users/route.ts` | Admin API — all users with wallet addresses |
| `app/api/admin/transactions/route.ts` | Admin API — all transactions with txHash + BscScan links |
| `app/api/admin/cards/route.ts` | Admin API — all cards with owner addresses |

### Design Decisions

**txHash stays in MongoDB, not in API responses.** The `confirmTransaction()` function in `lib/transactions.ts` still reads `tx.txHash` from the database to check on-chain receipts via `provider.getTransactionReceipt()`. The hash is a server-side implementation detail, not user-facing data.

**Two-layer status in `getTransactionStatus()`.** The function returns both `status` (friendly label for client) and `rawStatus` (internal code for logic). The transactions API route destructures to strip `rawStatus` before responding, but the internal code is available for `if (tx.rawStatus === "pending")` checks.

**Invoice ID derived from ObjectId timestamp.** MongoDB ObjectIds embed a 4-byte unix timestamp in their first 8 hex characters. `generateInvoiceId()` extracts this to produce a date-stamped ID (`GC-20260727-...`) without needing an extra database field. The last 4 hex chars of the ObjectId provide per-second uniqueness.

**Card statuses mapped differently from transaction statuses.** Transaction statuses (`pending/confirmed/failed`) map to `Processing/Success/Failed`. Card statuses (`pending/Digital/Vaulted`) map to `Processing/Ready/Printed`. The two domains have different semantics and different friendly labels.

**Admin console uses raw internal data.** The admin API routes bypass `friendlyTxStatus()` and `generateInvoiceId()` — they return raw MongoDB fields including `txHash`, `ObjectId`, and internal status codes. This gives developers full visibility while the user-facing routes remain sanitized.

## Usage

### Invoice ID Format

```
GC-YYYYMMDD-XXXX

GC-20260727-a3f1  ← July 27, 2026, unique suffix from ObjectId
GC-20260727-b8e2  ← same day, different transaction
```

### Status Mapping

| Internal (DB) | User-Facing | Card Status |
|---------------|-------------|-------------|
| `pending` | Processing | Processing |
| `confirmed` | Success | — |
| `failed` | Failed | — |
| `Digital` | — | Ready |
| `Vaulted` | — | Printed |

### Admin Console

**URL:** `https://<domain>/admin`

**Authentication:** HTTP Basic Auth. Browser shows native credential prompt.

**Tabs:**
- **Users:** email, username, full wallet address, join date
- **Transactions:** invoice ID + raw ObjectId, txHash with clickable BscScan link, friendly + raw status, type, timestamp
- **Cards:** tokenId, templateId, rarity (label), status, truncated owner address

### Environment Variables

```
ADMIN_USERNAME=<generated-username>
ADMIN_PASSWORD=<generated-password>
```

Must be set in both `.env.local` (development) and Vercel environment variables (production).

## Verification

### TypeScript

All changes pass `npx tsc --noEmit` with zero errors.

### txHash Leak Audit

Grep for `txHash` across all `app/api/` routes:

| Route | txHash Present | In Response? |
|-------|---------------|-------------|
| `POST /api/mint` | Yes (line 48, 59) | **No** — stored in MongoDB only |
| `POST /api/print` | Yes (line 26, 34) | **No** — stored in MongoDB only |
| `POST /api/redeem` | Yes (line 35, 43) | **No** — stored in MongoDB only |
| `GET /api/transactions` | No | **No** — uses destructuring to strip internal fields |
| `GET /api/scan` | No | **No** — history items omit txHash |
| `GET /api/cards` | No | **No** |
| `GET /api/admin/transactions` | Yes (line 31) | **Yes** — intentional for admin |

### Frontend txHash Audit

Grep for `txHash` across all `.tsx` files:

| File | txHash Present | Purpose |
|------|---------------|---------|
| `app/admin/page.tsx` | Yes (5 occurrences) | Admin console — intentional display with BscScan link |
| All other `.tsx` files | No | Clean |

### Manual Testing Checklist

**Part A — Verify sanitized responses:**
1. Open DevTools → Network tab
2. Buy a Pack → inspect `/api/mint` response body
   - Expected: `{status: "Processing", txId: "GC-...", cards: [...], newBalance: N}`
   - Must NOT contain: `txHash`
3. Request Print → inspect `/api/print` response
   - Expected: `{status: "Processing", txId: "GC-..."}`
   - Must NOT contain: `txHash`
4. Scan a card → inspect `/api/scan` response
   - Expected: history items have `{type, status: "Success"/"Processing", ...}`
   - Must NOT contain: `txHash` in history items
5. Check Collection page → card badges show "Ready" or "Printed" (not "Digital"/"Vaulted")

**Part B — Verify admin console:**
1. Add `ADMIN_USERNAME` and `ADMIN_PASSWORD` to Vercel env vars
2. Navigate to `/admin` → browser should show Basic Auth prompt
3. Enter correct credentials → admin dashboard loads
4. Tab "Users" → shows all users with full wallet addresses
5. Tab "Transactions" → shows invoice ID + raw ID, txHash with BscScan link
6. Tab "Cards" → shows tokenId, rarity, status, owner
7. Enter wrong credentials → 401 "Invalid credentials"

## Journey Log

- [lesson] Destructuring (`const { rawId, rawStatus, ...safe } = tx`) is cleaner than manually picking fields for stripping internal-only properties from API responses.
- [lesson] MongoDB ObjectId's embedded timestamp eliminates the need for a separate `createdAt` field when generating human-readable IDs — the first 8 hex chars are always the unix timestamp.
