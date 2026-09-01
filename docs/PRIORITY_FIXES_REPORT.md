# Priority Fixes Report — 29 July 2026

**Branch:** `main`  
**Commit:** `3c32ae9`

---

## 1. Admin Credentials Rotation (KRITIS)

**Status:** ✅ Done

| Item | Old | New |
|------|-----|-----|
| `ADMIN_USERNAME` | `[REDACTED]` | `[REDACTED]` |
| `ADMIN_PASSWORD` | `[REDACTED]` | `[REDACTED]` |

**Updated di:**
- [x] `frontend/.env.local` (local development)
- [x] Vercel Environment Variables (production)
- [x] Redeployed dengan kredensial baru

**Kredensial lama sudah tidak berfungsi** — sudah diverifikasi via curl (return 401).

---

## 2. Middleware Verification (KRITIS)

**Status:** ✅ Verified dengan curl sungguhan

### Test Results

```bash
# Test 1: Tanpa auth → harus 401
$ curl -s -o /dev/null -w "%{http_code}" https://gachard.vercel.app/admin
401  ✅

# Test 2: Dengan kredensial BARU → harus 200
$ curl -s -o /dev/null -w "%{http_code}" -u "[REDACTED]" https://gachard.vercel.app/admin
200  ✅

# Test 3: Dengan kredensial LAMA → harus 401 (sudah di-rotate)
$ curl -s -o /dev/null -w "%{http_code}" -u "[REDACTED]" https://gachard.vercel.app/admin
401  ✅
```

**Kesimpulan:** Middleware berfungsi sempurna. Protected routes ter-guard.

---

## 3. /api/print — Card Ownership Verification (PENTING)

**Status:** ✅ Done  
**File:** `frontend/app/api/print/route.ts`

### Masalah
Endpoint `/api/print` menerima `{ userId, tokenId }` tanpa verifikasi bahwa kartu dengan `tokenId` benar-benar milik user dengan `userId`. Siapapun bisa print kartu milik user lain.

### Fix
Tambah verifikasi kepemilikan sebelum proses print:

```typescript
// Verify card ownership — user hanya bisa print kartu milik sendiri
const cardsCollection = await getCollection("cards");
const card = await cardsCollection.findOne({ tokenId });
if (!card) {
  return NextResponse.json({ error: "Card not found" }, { status: 404 });
}
if (card.ownerAddress !== user.walletAddress) {
  return NextResponse.json({ error: "Card does not belong to this user" }, { status: 403 });
}
```

### Flow
1. Get user dari DB (sudah ada)
2. **Get card by tokenId** (baru)
3. **Cek `card.ownerAddress === user.walletAddress`** (baru)
4. Jika tidak cocok → **403 Forbidden** (baru)
5. Jika cocok → lanjut proses print (existing)

### Dampak
- User hanya bisa print kartu milik sendiri
- Card not found → 404
- Card milik user lain → 403

---

## 4. lib/vision.ts — Git History Confirmation

**Status:** ✅ Bisa di-restore

File `lib/vision.ts` bisa di-restore dari git history:

```bash
# Restore dari commit sebelum dihapus
git show f55ed14:frontend/lib/vision.ts

# Atau restore ke working tree
git checkout f55ed14 -- frontend/lib/vision.ts
```

**Commits yang mengandung file:**
- `f55ed14` — sprint-6: stabilization + pitch deck outline
- `9b32619` — feat: AI vision integration with Gemini API + blockchain retry logic
- `c0c97b0` — fix: critical security & reliability fixes (dihapus di sini)
- `a869e34` — Merge branch 'main' (merge conflict resolution)

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/.env.local` | Updated admin credentials |
| `frontend/app/api/print/route.ts` | Added ownership verification |

---

## Verification Summary

| Check | Result |
|-------|--------|
| Admin no-auth → 401 | ✅ Pass |
| Admin new-auth → 200 | ✅ Pass |
| Admin old-auth → 401 | ✅ Pass |
| Print ownership check | ✅ Implemented |
| `npm run build` | ✅ Pass |
| `lib/vision.ts` restorable | ✅ Confirmed |
