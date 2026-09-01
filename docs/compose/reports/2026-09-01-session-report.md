---
feature: full-security-hardening-and-cleanup
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-09-01-server-side-session.md
branch: feat/ai-anomaly-detection-oracle
commits: b1cdd11..1f99efe
---

# Full Security Hardening & Cleanup — Final Session Report

**Tanggal**: 1 September 2026
**Branch**: `feat/ai-anomaly-detection-oracle`
**Total commit**: 36 (b1cdd11 → 1f99efe)
**File diubah**: ~50 file

---

## What Was Built

### 1. Security Audit (Investigation Phase)

Tiga agen investigasi paralel menemukan **3 kelas kerentanan sistemik**:

- **Mass IDOR** — 19 endpoint API tanpa server-side auth. Semua route trust `userId` dari client.
- **Secrets bocor di git** — 11 file tracked berisi credential plaintext (MongoDB, admin, API keys, encryption key).
- **Smart contract vulnerabilities** — 2 Critical (C-1, C-2) + 2 High (H-1, H-2) pada GachardCard.sol.

Laporan: `docs/compose/reports/security-audit-2026-09-01.md`

### 2. Server-Side Session (P0 — IDOR Fix)

Sistem autentikasi server-side untuk menutup Mass IDOR pada semua 19 endpoint:

- **`lib/session.ts`** — HMAC-SHA256 session token. Format: `userId.timestamp.signature`.
- **Auth routes** — Set `gachard_session` httpOnly cookie pada login.
- **Middleware** — Extended ke `/api/*` routes. Validasi di Edge Runtime pakai Web Crypto API.
- **19 API routes** — Semua migrate ke `getAuthenticatedUser(req)`.
- **20 frontend files** — 55 fetch calls di-update (hapus `userId`, tambah `credentials: "include"`).
- **Backward compatibility** — `gachard_uid` cookie (legacy) tetap diterima via fallback.

### 3. Post-Deploy Bug Fixes (6 bugs)

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| Edge Runtime crash | Node.js `crypto` di middleware | Web Crypto API inline | `63adb31` |
| Existing users blocked | Tidak ada `gachard_session` cookie | Accept EITHER cookie | `7e47868` |
| Mint E11000 | Unique index `tokenId_1` tolak null | Non-unique sparse index | `18ae62a` |
| Pack price di history | Tampil untuk mint transactions | Hidden untuk type `mint` | `0ca7b49` |
| Navbar balance tidak update | Tidak ada event setelah transaksi | `balance-change` event dispatch | `387e70f` |
| Mint/redeem generic error | Error message tidak spesifik | Show actual error message | `0f4668b`, `8edfdd8` |

### 4. QR Scanner Fixes (5 bugs)

| Issue | Fix | Commit |
|-------|-----|--------|
| Scanner restart setiap render | `useRef` untuk `onScan` callback | `65ab083` |
| Tidak ada permission prompt | Explicit `getUserMedia` call | `e62c8db` |
| Camera diblokir browser | Hapus `camera=()` dari Permissions-Policy | `6fc95e9` |
| html5-qrcode tidak reliable | Ganti pakai native `getUserMedia` + `BarcodeDetector` | `51e9b9b` |
| Brave tidak support BarcodeDetector | Fallback pakai `jsQR` library | `cf79f1a` |

### 5. Performance Optimization

| Item | Sebelum | Sesudah | Penghematan |
|------|---------|---------|-------------|
| Card images (11 file) | 3.8 MB | 1.2 MB | -68% |
| Logo PNG (2 file) | 518 KB | 10 KB | -98% |
| Icon-512 | 154 KB | 32 KB | -79% |
| **Total gambar** | **4.5 MB** | **1.2 MB** | **-73%** |

### 6. Data Fixes (Burned Card Inconsistencies)

| Card | TokenId | Issue | Fix | Commit |
|------|---------|-------|-----|--------|
| `47ec6` | 149 | Dismantled then printed → status "Real" | Fixed to "Burned" | `8152d8a` |
| `f61c0` | 148 | Dismantle tx Success but status "Digital" | Fixed to "Burned" | `3904fae` |
| `1b48c` | 16 | Dismantle tx (scalar tokenId) missed by fix endpoint | Fixed to "Burned" | `32b41b0` |

- `fix-burned-card` endpoint updated to handle both `tx.tokenIds` (array) and `tx.tokenId` (scalar)
- `mongodb.ts` index declaration updated: `unique: true` → `sparse: true`
- Print dan redeem routes: tambah validasi `status === "Burned"` block

### 7. UI Improvements

| Feature | Description | Commit |
|---------|-------------|--------|
| QR merged ke Verified authentic | Hapus "Scan for Details" section terpisah | `26643cf` |
| Scan link icon | External link di header "Card Details" → buka scan page di new tab | `e473036` |
| WIB timestamps | Transaction History di scan page pakai format WIB (GMT+7) | `768d51e` |

### 8. Credential Rotation (P1)

| Credential | Lama | Baru | Status |
|-----------|------|------|--------|
| MongoDB password | `%23Gihasy2811` | Di-rotate oleh user | Done |
| `ADMIN_USERNAME` | `admin-uylbdz` | `admin-97df4f37` | Done (Vercel + local) |
| `ADMIN_PASSWORD` | `GwX+hXgQ3xd3...` | `lTFxRfCLH3hma1s...` | Done (Vercel + local) |
| `ENCRYPTION_SECRET_KEY` | `gachard-hackathon-2026...` | `L6CfIKs2MuX2l7L6...` | Done (Vercel + local) |
| `ADMIN_PRIVATE_KEY` | `0xf77d18e4...` | `0x05a3996c...` | Done (Vercel + local) |
| `ADMIN_WALLET_ADDRESS` | `0xF7DEd49E...` | `0x869e4d60...` | Done (Vercel + local) |
| `GEMINI_API_KEY` | `AQ.Ab8RN6I...` | Dilewati | Pending |
| `CONTRACT_ADDRESS` | `0x16df46a0...` | `0x5359d0bd...` | Done (Vercel + local) |

**Secrets scrubbed** dari 11 tracked files. `.gitignore` updated: `memory/`, `MEMORY.md`, `LAPORAN_AKHIR.md` excluded.

**Database clean-slated**: 196 dokumen dihapus, 8 card_templates + 8 users dipertahankan.

### 9. Smart Contract Fixes (C-1, C-2, H-1, H-2)

| Vulnerability | Fix | Commit |
|--------------|-----|--------|
| **C-2** | `require(ownerAddress != address(0))` + `require(balanceOf(ownerAddress, tokenId) == 1)` di `requestPrint()` | `1f99efe` |
| **C-1** | C-2 fix mencegah `lastOwner == address(0)` + `require(previousOwner != address(0))` di `redeemCard()` | `1f99efe` |
| **H-1** | `redeemCard()` sekarang `onlyOwner` | `1f99efe` |
| **H-2** | `_update()` update `lastOwner` pada standard ERC1155 transfers | `1f99efe` |

**Kontrak baru**: `0x5359d0bd7d02ad81659526958d606d4c61b2ba46`
**Tests**: 54/54 pass (1 test di-update: `test_redeemCard_works_when_called_by_anyone` → `test_redeemCard_reverts_when_called_by_non_owner`)
**Deployer**: `0x869e4d60819c6C09f672a04bDa0bbADdD924215e`

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

### Smart Contract Fixes

```
requestPrint():
  + require(ownerAddress != address(0))     ← C-2 fix
  + require(balanceOf(ownerAddress, tokenId) == 1)  ← C-2 fix

redeemCard():
  + onlyOwner modifier                      ← H-1 fix
  + require(previousOwner != address(0))    ← C-1 safety check

_update():
  + lastOwner[ids[i]] = to                  ← H-2 fix (on standard transfers)
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/session.ts` | Session token create/verify, `getAuthenticatedUser()` |
| `middleware.ts` | Edge-compatible session validation (Web Crypto API) |
| `components/QRScanner.tsx` | Native camera + BarcodeDetector + jsQR fallback |
| `components/CardDetailModal.tsx` | QR code in verification section + scan link icon |
| `contracts/src/GachardCard.sol` | Smart contract with C-1/C-2/H-1/H-2 fixes |
| `app/api/admin/fix-burned-card/route.ts` | Auto-fix burned card data inconsistencies |
| `app/api/admin/fix-index/route.ts` | One-time DB index fix |
| 19 API route files | Migrated to `getAuthenticatedUser()` |
| 20 frontend files | Removed `userId` from fetch calls |

---

## Verification

- **Build**: `npm run build` pass — 54 static pages, 40+ API routes
- **Smart contract**: `forge test` — 54/54 tests pass
- **Deploy**: Pushed ke `main`, Vercel auto-deploy ke `gachard.vercel.app`
- **Contract deploy**: `0x5359d0bd7d02ad81659526958d606d4c61b2ba46` on BNB Testnet
- **Clean-slate**: 196 docs deleted, 8 templates + 8 users preserved
- **Credential rotation**: All env vars updated di Vercel via CLI

---

## Journey Log

- [dead end] Middleware import `@/lib/session` (Node.js `crypto`) → crash di Vercel Edge Runtime. Fix: inline Web Crypto API.
- [dead end] Auto-migration middleware buat session token pakai Web Crypto, route handler verifikasi pakai Node.js crypto → HMAC mismatch. Fix: middleware accept EITHER cookie.
- [dead end] Sparse unique index tetap tolak `tokenId: null` di MongoDB Atlas. Fix: non-unique sparse.
- [dead end] `Permissions-Policy: camera=()` di next.config.ts blokir semua camera access. Fix: hapus `camera=()`.
- [dead end] `html5-qrcode` library tidak reliable. Fix: native `getUserMedia` + `BarcodeDetector` + `jsQR` fallback.
- [dead end] `fix-burned-card` endpoint skip `tx.tokenId` (scalar) karena hanya baca `tx.tokenIds` (array). Fix: fallback ke `tx.tokenId`.
- [dead end] New wallet `0x869e4d...` punya 0 BNB untuk gas. Fix: kirim dari wallet lama.
- [lesson] Jangan buat session token di dua tempat berbeda (Edge + Node.js) dengan crypto library berbeda.
- [lesson] `Permissions-Policy` header bisa memblokir API tanpa error yang jelas.
- [lesson] MongoDB `createIndex` idempotent — code `unique: true` tidak mengubah index yang sudah ada sebagai non-unique. Pastikan code sesuai dengan state aktual.
- [lesson] Transaction schema inconsistency (`tx.tokenIds` array vs `tx.tokenId` scalar) — selalu handle kedua field.

---

## Commits (36 total)

| SHA | Message |
|-----|---------|
| `b1cdd11` | feat(auth): add server-side session token helpers |
| `7461182` | feat(auth): set HMAC session cookie on login |
| `85b1515` | feat(auth): protect API routes with session middleware |
| `ab2e5a6` | fix(security): migrate 3 MEDIUM endpoints to server-side session |
| `81ceb94` | fix(security): migrate 7 HIGH endpoints to server-side session |
| `5038c2b` | fix(security): migrate 5 CRITICAL endpoints to server-side session |
| `1ba47b5` | fix(security): remove userId from frontend API calls |
| `5dc33b5` | docs: security audit report + implementation plan |
| `0ca7b49` | fix(ui): hide pack price from card detail for mint transactions |
| `63adb31` | fix(auth): use Web Crypto API in middleware for Edge Runtime |
| `4dde54d` | fix(auth): auto-migrate legacy gachard_uid cookie |
| `7e47868` | fix(auth): accept legacy gachard_uid cookie in route handlers |
| `0f4668b` | fix(debug): show actual error message in mint failure |
| `bc7e0e6` | fix(db): add admin endpoint to fix tokenId index |
| `18ae62a` | fix(db): change tokenId index to non-unique sparse |
| `547670b` | fix(ui): refresh balance when user dropdown opens |
| `387e70f` | fix(ui): dispatch balance-change event after transactions |
| `bcde44f` | docs: session report (part 1) |
| `65ab083` | fix(scan): prevent QR scanner restart on every render |
| `e62c8db` | fix(scan): explicitly request camera permission |
| `51e9b9b` | fix(scan): replace html5-qrcode with native getUserMedia |
| `6fc95e9` | fix(scan): remove camera=() from Permissions-Policy |
| `cf79f1a` | fix(scan): add jsQR fallback for Brave/Firefox |
| `2588d14` | perf: compress images — 73% size reduction |
| `8edfdd8` | fix(debug): show actual error in redeem failure |
| `99a42f5` | fix: block print/redeem for burned cards |
| `8152d8a` | fix(db): restore burned card #47ec6 status |
| `3904fae` | fix(db): auto-fix all cards with dismantle tx but not Burned |
| `26643cf` | feat(ui): merge QR into Verified authentic section |
| `768d51e` | feat(ui): scan link icon + WIB timestamps |
| `e473036` | fix(ui): move scan link icon to Card Details header |
| `30386d8` | docs: final session report (part 2) |
| `32b41b0` | fix(db): fix-burned-card also checks tx.tokenId scalar |
| `422ea05` | fix(db): update tokenId index declaration in mongodb.ts |
| `2dde2be` | security: scrub secrets from 11 files + update .gitignore |
| `7ae639b` | chore: trigger redeploy with new credentials |
| `1f99efe` | fix(contract): C-1/C-2/H-1/H-2 fixes |

---

## Remaining Work (P3 — Low Priority)

| Task | Status |
|------|--------|
| Cleanup: hapus `userId` prop dari CardItem dan ListingModal | Pending |
| Cleanup: hapus admin endpoint one-time (`fix-index`, `fix-burned-card`) | Pending |
| `GEMINI_API_KEY` rotation | Pending (user chose to skip) |
| Git history purge (`git filter-repo` / BFG) — secrets masih di old commits | Pending |

---

## Source Materials

| File | Role |
|------|------|
| `docs/compose/reports/security-audit-2026-09-01.md` | Full security audit report |
| `docs/compose/reports/2026-09-01-session-report.md` | Session report (part 1-2) |
| `docs/compose/plans/2026-09-01-server-side-session.md` | Implementation plan (8 tasks) |
| `contracts/src/GachardCard.sol` | Smart contract with all fixes |
| `contracts/test/GachardCard.t.sol` | 54/54 tests passing |
