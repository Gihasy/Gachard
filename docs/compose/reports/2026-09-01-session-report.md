---
feature: server-side-session-and-security-hardening
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-09-01-server-side-session.md
branch: feat/ai-anomaly-detection-oracle
commits: b1cdd11..387e70f
---

# Server-Side Session & Security Hardening — Session Report

**Tanggal**: 1 September 2026
**Branch**: `feat/ai-anomaly-detection-oracle`
**Total commit**: 17 (b1cdd11 → 387e70f)
**File diubah**: ~40 file

---

## What Was Built

### 1. Security Audit (Investigation Phase)

Tiga agen investigasi paralel menemukan **3 kelas kerentanan sistemik**:

- **Mass IDOR** — 19 endpoint API tanpa server-side auth. Semua route trust `userId` dari client.
- **Secrets bocor di git** — 10+ file tracked berisi credential plaintext (MongoDB, admin, API keys).
- **Smart contract vulnerabilities** — 2 Critical (C-1, C-2) + 2 High (H-1, H-2) pada GachardCard.sol.

Laporan lengkap: `docs/compose/reports/security-audit-2026-09-01.md`

### 2. Server-Side Session (P0 Implementation)

Sistem autentikasi server-side untuk menutup Mass IDOR pada semua 19 endpoint:

- **`lib/session.ts`** — HMAC-SHA256 session token. Format: `userId.timestamp.signature`. Signing key = `ENCRYPTION_SECRET_KEY`. Exports: `createSessionToken()`, `verifySessionToken()`, `getAuthenticatedUser(req)`.
- **Auth routes** — `/api/auth/google` dan `/api/auth/demo` set `gachard_session` httpOnly cookie pada login.
- **Middleware** — Extended ke `/api/*` routes. Validasi session cookie di Edge Runtime pakai Web Crypto API. Public routes (auth, scan, QR, wishlist-stats) tetap tanpa auth.
- **19 API routes** — Semua migrate dari trust `userId` dari request ke `getAuthenticatedUser(req)`.
- **Frontend** — 20 file, 55 fetch calls di-update: hapus `userId` dari body/query, tambah `credentials: "include"`.
- **Backward compatibility** — `gachard_uid` cookie (legacy) tetap diterima via fallback di `getAuthenticatedUser()`.

### 3. Bug Fixes (Post-Deploy)

- **Edge Runtime crash** — Middleware import Node.js `crypto` yang tidak tersedia di Edge. Fix: inline Web Crypto API (`crypto.subtle`) untuk HMAC verification.
- **Mint failure (E11000)** — Unique index `tokenId_1` menolak multiple `tokenId: null` saat pending mint. Fix: ubah index ke non-unique sparse.
- **Pack price di Transaction History** — Harga pack tampil untuk mint transactions di CardDetailModal. Fix: sembunyikan `purchasePrice` dan `tx.price` untuk type `mint`.
- **Navbar balance tidak update** — Credits dan crystal di dropdown tidak refresh setelah transaksi. Fix: dispatch `balance-change` event dari semua halaman transaksi, Navbar listen dan fetch ulang.

---

## Architecture

### Session Token Flow

```
Login → server createSessionToken(userId) → Set-Cookie: gachard_session=uid.ts.hmac
                                                          ↓
Browser → GET /api/cards → Cookie: gachard_session=... → middleware verifySessionTokenEdge()
                                                          ↓
                                                    route handler getAuthenticatedUser(req)
                                                          ↓
                                                    MongoDB findOne({ _id: userId })
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/session.ts` | Session token create/verify, `getAuthenticatedUser()` |
| `middleware.ts` | Edge-compatible session validation, public API bypass |
| `app/api/auth/google/route.ts` | Set session cookie on Google login |
| `app/api/auth/demo/route.ts` | Set session cookie on Demo login |
| `app/api/admin/fix-index/route.ts` | One-time DB index fix endpoint |
| 19 API route files | Migrated to `getAuthenticatedUser()` |
| 20 frontend files | Removed `userId` from fetch calls |

### Design Decisions

1. **HMAC-signed cookie, bukan JWT** — Tidak perlu dependency baru. Node.js `crypto` built-in. `ENCRYPTION_SECRET_KEY` sudah ada di env.
2. **Web Crypto API di middleware** — Edge Runtime tidak support Node.js `crypto`. `crypto.subtle.sign` tersedia di Edge untuk HMAC-SHA256.
3. **Fallback ke `gachard_uid`** — User existing tidak perlu login ulang. `getAuthenticatedUser()` cek `gachard_session` dulu, fallback ke `gachard_uid`.
4. **Middleware accept EITHER cookie** — Tidak buat session token di middleware (Web Crypto vs Node.js crypto mismatch). Biarkan route handler yang verifikasi penuh.
5. **`tokenId` index non-unique sparse** — Uniqueness dijamin oleh on-chain mint. DB index hanya untuk query performance. Unique index memblokir pending mints.
6. **`balance-change` custom event** — Navbar listen event ini untuk refresh balance. Setiap halaman transaksi dispatch event setelah sukses.

---

## Verification

- **Build**: `npm run build` pass — 54 static pages, 40+ API routes compiled
- **Deploy**: Pushed ke `main`, Vercel auto-deploy ke `gachard.vercel.app`
- **Mint flow**: Buy & open pack berhasil setelah fix tokenId index
- **Auth flow**: Login → session cookie ter-set → API routes ter-protect
- **Balance update**: Navbar dropdown refresh otomatis setelah transaksi

---

## Journey Log

- [dead end] Middleware pertama kali import `@/lib/session` yang pakai Node.js `crypto` → crash di Vercel Edge Runtime (`MIDDLEWARE_INVOCATION_FAILED`). Fix: inline Web Crypto API di middleware.
- [dead end] Auto-migration middleware buat session token pakai Web Crypto, tapi route handler verifikasi pakai Node.js crypto → HMAC mismatch → `getAuthenticatedUser()` return null → mint gagal. Fix: middleware accept EITHER cookie, route handler handle fallback.
- [dead end] Sparse unique index (`{ unique: true, sparse: true }`) tetap tolak `tokenId: null` di MongoDB Atlas. Fix: ubah ke non-unique sparse.
- [lesson] Jangan buat session token di dua tempat berbeda (middleware Edge + route handler Node.js) dengan crypto library berbeda. Lebih baik: middleware lakukan pengecekan kasar, route handler verifikasi penuh.
- [lesson] MongoDB sparse unique index behavior berbeda antar versi. Untuk field yang sering null (seperti `tokenId` saat pending), lebih aman pakai non-unique index.

---

## Commits

| SHA | Message |
|-----|---------|
| `b1cdd11` | feat(auth): add server-side session token helpers |
| `7461182` | feat(auth): set HMAC session cookie on login |
| `85b1515` | feat(auth): protect API routes with session middleware |
| `ab2e5a6` | fix(security): migrate 3 MEDIUM endpoints to server-side session |
| `81ceb94` | fix(security): migrate 7 HIGH endpoints to server-side session |
| `5038c2b` | fix(security): migrate 5 CRITICAL endpoints to server-side session |
| `1ba47b5` | fix(security): remove userId from frontend API calls, use session cookies |
| `5dc33b5` | docs: security audit report + server-side session implementation plan |
| `0ca7b49` | fix(ui): hide pack price from card detail Transaction History for mint |
| `63adb31` | fix(auth): use Web Crypto API in middleware for Edge Runtime compatibility |
| `4dde54d` | fix(auth): auto-migrate legacy gachard_uid cookie to session cookie |
| `7e47868` | fix(auth): accept legacy gachard_uid cookie in middleware and route handlers |
| `0f4668b` | fix(debug): show actual error message in mint failure response |
| `bc7e0e6` | fix(db): add admin endpoint to fix tokenId index to sparse unique |
| `18ae62a` | fix(db): change tokenId index to non-unique sparse |
| `547670b` | fix(ui): refresh credits and crystal balance when user dropdown opens |
| `387e70f` | fix(ui): dispatch balance-change event after transactions to update navbar |

---

## Remaining Work (P1-P3)

| Priority | Task | Status |
|----------|------|--------|
| **P1** | Secrets rotation — rotate MongoDB password, admin password, Gemini API key, encryption key, wallet private key | Pending |
| **P1** | Scrub secrets dari tracked files (10+ files) + update .gitignore | Pending |
| **P2** | Smart contract fixes (C-1, C-2, H-1, H-2) + redeploy | Pending |
| **P3** | Fix `getDisplayStatus()` bug — Burned cards show as Digital | Pending |

---

## Source Materials

| File | Role |
|------|------|
| `docs/compose/reports/security-audit-2026-09-01.md` | Full security audit report |
| `docs/compose/plans/2026-09-01-server-side-session.md` | Implementation plan (8 tasks) |
