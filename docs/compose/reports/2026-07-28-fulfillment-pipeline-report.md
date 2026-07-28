# Laporan Fulfillment Pipeline & UI Fixes — 28 Juli 2026 (Lanjutan)

## Ringkasan Eksekutif

Laporan ini mencakup perubahan setelah commit `93e4d66` (laporan sebelumnya). Mencakup: (1) implementasi physical fulfillment pipeline, (2) smart contract update, (3) shipping address form, (4) fix status sync, (5) redesign profile page, dan (6) perbaikan bahasa. Total 5 commit, 12+ file berubah, 5x deploy ke production.

---

## 1. Physical Fulfillment Pipeline

### 1.1 Smart Contract Update

**File:** `contracts/src/GachardCard.sol`

**Perubahan:** Hapus `_update(ownerAddress, address(this), ids, values)` dari `requestPrint()`. Kartu sekarang TETAP di wallet user, hanya `cardStatus` berubah ke Vaulted.

**Sebelum:**
```solidity
function requestPrint(...) {
    // Transfer ke vault DULU
    _update(ownerAddress, address(this), ids, values);
    // Baru ubah status
    cardStatus[tokenId] = CardStatus.Vaulted;
}
```

**Sesudah:**
```solidity
function requestPrint(...) {
    // Ubah status ke Vaulted — kartu TETAP di wallet user
    cardStatus[tokenId] = CardStatus.Vaulted;
}
```

**`redeemCard()` juga diubah:** Transfer dari `lastOwner` (user) bukan `address(this)` (contract).

**Verifikasi:**
- Forge test: 31/31 pass
- Kontrak baru: `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a`
- Test on-chain: `cardStatus=Vaulted`, `userBalance=1`, `safeTransferFrom → REVERT`

### 1.2 Fulfillment Status Schema

**Field baru:** `cards.fulfillmentStatus`

| Nilai | Keterangan |
|-------|------------|
| `null` | Kartu Digital biasa, belum request print |
| `Locked` | Print requested, on-chain Vaulted |
| `Processing` | Admin mulai proses cetak |
| `Printed` | Kartu sudah dicetak |
| `Shipping` | Kartu dalam pengiriman |
| `Real` | Kartu sudah diterima user (final) |

**Collection baru:** `shipping_addresses`
- Fields: `userId`, `tokenId`, `recipientName`, `addressLine1`, `addressLine2`, `city`, `postalCode`, `phone`

### 1.3 Print Checkout Update

**File:** `app/api/print/checkout/route.ts`

| Item | Sebelum | Sesudah |
|------|---------|--------|
| Harga | $9.99 (print only) | **$14.99** (print + shipping flat rate) |
| Alamat | Tidak ada | Wajib isi sebelum checkout |
| Validasi | Tidak ada | 5 field required |

**Validasi API:**
```typescript
if (!shippingAddress.recipientName || !shippingAddress.addressLine1 || 
    !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.phone) {
  return NextResponse.json({ error: "Shipping address incomplete" }, { status: 400 });
}
```

### 1.4 Admin Fulfillment Controls

**File baru:** `app/api/admin/fulfillment/route.ts`

**File dimodifikasi:** `app/admin/page.tsx`

Tombol tunggal "Accept Print" diganti rangkaian aksi bertahap:

| Status Saat Ini | Tombol | Status Berikutnya |
|-----------------|--------|-------------------|
| Locked | "Accept & Start Processing" | Processing |
| Processing | "Mark as Printed" | Printed |
| Printed | "Mark as Shipped" + input tracking | Shipping |
| Shipping | "Mark as Delivered" | Real |

**Fitur tambahan:**
- Alamat pengiriman ditampilkan di setiap baris print request
- Input nomor resi opsional saat "Mark as Shipped"
- Saat "Real", redeem code otomatis ditandai "accepted"

### 1.5 User-Facing Labels

**File:** `app/profile/page.tsx`

| fulfillmentStatus | User sees |
|-------------------|-----------|
| null | Tidak ditampilkan |
| Locked/Processing/Printed/Shipping | **"In Progress"** |
| Real | **"Real"** |

**Stats baru:**
- Total Digital (belum pernah request print)
- In Progress (gabungan Locked/Processing/Printed/Shipping)
- Real (delivered)

---

## 2. Shipping Address Form

**File:** `components/CardItem.tsx`

**Perubahan:** Modal form muncul saat user klik "Print" pada kartu.

**Fields:**
- Recipient Name *
- Address Line 1 *
- Address Line 2 (opsional)
- City *
- Postal Code *
- Phone *

**Validasi UI:**
```typescript
const isFormValid =
  form.recipientName.trim() &&
  form.addressLine1.trim() &&
  form.city.trim() &&
  form.postalCode.trim() &&
  form.phone.trim();
```

Button "Pay $14.99 & Print" disabled jika ada field required kosong.

---

## 3. Fix Status Sync

**Masalah:** `status` kartu tetap "Digital" meskipun `fulfillmentStatus` sudah "Shipping"

**Root cause:** `/api/print` route hanya set `fulfillmentStatus = "Locked"` tapi tidak update `status` ke "Vaulted"

**Fix:**

| File | Perubahan |
|------|-----------|
| `app/api/print/route.ts` | Tambah `$set: { status: "Vaulted" }` |
| `app/api/admin/fulfillment/route.ts` | Tambah `$set: { status: "Real" }` saat delivery |

**Database fix:** tokenId=2 yang stuck di "Digital" dengan "Shipping" fulfillment diperbaiki ke "Vaulted"

**Verifikasi:**
```
tokenId=1 status=Vaulted fulfillment=Locked
tokenId=2 status=Vaulted fulfillment=Shipping
tokenId=3-16 status=Digital fulfillment=null
```

---

## 4. Profile Page Redesign

**File:** `app/profile/page.tsx`

**Layout sebelum:**
```
┌─────────────────┬─────────────────┐
│ Profile         │ Stats           │
│ Quick Actions   │ Redeem Card     │
└─────────────────┴─────────────────┘
```

**Layout sesudah:**
```
┌─────────────────┬─────────────────┐
│ Profile         │ Your Collection │
│ Stats           │ (card grid)     │
│ Redeem Card     │                 │
└─────────────────┴─────────────────┘
```

**Perubahan:**
- Quick Actions dihapus
- Collection Stats dipindah ke bawah profile
- Redeem Card di bawah stats
- Kartu user ditampilkan di kanan dengan artwork, rarity, dan status

---

## 5. Language Fix

**Perubahan:**

| File | Sebelum | Sesudah |
|------|---------|---------|
| `components/PackCard.tsx` | "kartu random", "Dijamin" | "random cards", "Guaranteed" |
| `app/collection/page.tsx` | `koleksi-*` test IDs | `collection-*` test IDs |
| `app/profile/page.tsx` | `profil-*` test IDs | `profile-*` test IDs |

---

## 6. CONTRACT_ADDRESS Verification

**Status:** Vercel production env var sudah diupdate ke `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a`

```
$ npx vercel env update CONTRACT_ADDRESS production --yes
> Updated Environment Variable CONTRACT_ADDRESS in Project frontend [309ms]
```

Redeploy dilakukan setelah update env var.

---

## 7. Deploy History

| # | Commit | Message | Deploy |
|---|--------|---------|--------|
| 1 | `026c37c` | Physical fulfillment pipeline - smart contract, schema, admin controls, clean-slate | ✅ Production |
| 2 | `eba0719` | Add shipping address form to CardItem print flow with validation | ✅ Production |
| 3 | `7f9ae39` | Update card status to Vaulted on print, Real on delivery complete | ✅ Production |
| 4 | `74764c7` | Profile page redesign - remove quick actions, stats under profile, collection on right | ✅ Production |
| 5 | `fa557c8` | Replace Indonesian text with English - test IDs, PackCard labels | ✅ Production |

---

## 8. Verifikasi

| Item | Status | Bukti |
|------|--------|-------|
| Smart contract tests | ✅ Pass | 31/31 forge tests pass |
| On-chain transfer block | ✅ Verified | `safeTransferFrom` → REVERT for Vaulted cards |
| Fulfillment schema | ✅ Verified | `fulfillmentStatus` field in cards collection |
| Shipping address | ✅ Verified | Form with validation, API reject if incomplete |
| Status sync fix | ✅ Verified | tokenId=2 fixed to Vaulted |
| Profile redesign | ✅ Verified | Build pass, deploy success |
| Language fix | ✅ Verified | No Indonesian text in user-facing strings |
| CONTRACT_ADDRESS | ✅ Verified | Vercel env var updated to new contract |

---

## 9. Dokumen yang Dihasilkan

| File | Tipe | Keterangan |
|------|------|------------|
| `docs/compose/reports/2026-07-28-fulfillment-pipeline-report.md` | Report | Laporan ini |

---

## 10. Ringkasan Perubahan File

| Kategori | File Baru | File Dimodifikasi | Total |
|----------|-----------|-------------------|-------|
| Smart Contract | 0 | 2 | 2 |
| Fulfillment Schema | 1 | 3 | 4 |
| Shipping Form | 0 | 1 | 1 |
| Status Fix | 0 | 2 | 2 |
| Profile Redesign | 0 | 1 | 1 |
| Language Fix | 0 | 3 | 3 |
| **Total** | **1** | **12** | **13** |

---

## 11. Status Database Saat Ini

```
redeem_codes: 0 documents
rate_limits: 0 documents
cards: 16 documents (tokenId 1-16)
transactions: 2 documents
shipping_addresses: 0 documents
payments: 0 documents

tokenId=1 status=Vaulted fulfillment=Locked
tokenId=2 status=Vaulted fulfillment=Shipping
tokenId=3-16 status=Digital fulfillment=null
```

---

## 12. Kontrak Aktif

| Item | Nilai |
|------|-------|
| Address | `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a` |
| Chain | BNB Testnet (97) |
| Admin Wallet | `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa` |
| Fitur | `mintBatch`, `requestPrint` (no vault transfer), `redeemCard` (from user) |

---

*Laporan ini disusun pada 28 Juli 2026, mencakup perubahan setelah commit `93e4d66` hingga commit `fa557c8`.*
