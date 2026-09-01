# Session Report — 25 Agustus 2026

## Ringkasan
Sesi ini mencakup **bug fixes, performance optimization, UI improvements, dan fitur baru** pada platform Gachard. Total **20 commit** (termasuk 3 revert), **12 file** berubah.

---

## Perubahan yang Dilakukan

### 1. Bug Fix: Logout tidak update Navbar
- **Root cause**: Navbar baca `localStorage("user")` hanya saat mount (`useEffect([], [])`). `router.push("/")` adalah soft navigation — Navbar tidak remount.
- **Fix**: Dispatch `auth-change` custom event saat logout, Navbar listen dan re-read localStorage.
- **Files**: `app/profile/page.tsx`, `components/Navbar.tsx`
- **Commit**: `1162024`

### 2. Performance: Listings API N+1 FVM queries
- **Root cause**: `getFVM()` dipanggil per listing, masing-masing 1-3 MongoDB queries. 20 listing = 20-60 queries.
- **Fix**: Batch FVM calculation — fetch semua sold transactions dalam 2 queries, compute in-memory. 3N → 3 queries.
- **File**: `app/api/marketplace/listings/route.ts`
- **Commit**: `b4d99f7`

### 3. Admin Clean-Slate API Endpoint
- **Endpoint**: `POST/GET /api/admin/clean-slate` (protected HTTP Basic Auth)
- **Collections dihapus**: cards, transactions, redeem_codes, rate_limits, shipping_addresses, payments, listings, wishlist
- **Dipertahankan**: users, card_templates
- **File**: `app/api/admin/clean-slate/route.ts`
- **Commits**: `b4d99f7`, `80725ab`
- **Note**: Vercel ADMIN_USERNAME/ADMIN_PASSWORD env vars disinkronkan dengan .env.local

### 4. UI: Trade Page Sort Dropdown
- **Sebelum**: Native `<select>` element dengan styling minimal
- **Sesudah**: Custom dropdown — dark glass background, ikon sort, chevron rotation, highlight emas pada opsi aktif, click-outside to close
- **File**: `app/trade/page.tsx`
- **Commit**: `8a270a9`

### 5. Responsive: CoreLoop Homepage Section
- **Issues**: Card edges clipped oleh `overflow: hidden`, excessive bottom whitespace, cards terlalu kecil di desktop, tablet edge tightness
- **Fix**: Hapus `overflow: hidden`, kurangi tilt 8°→6°, perbesar card width max 340px→380px, kurangi padding
- **File**: `components/home/HomeCoreLoop.tsx`
- **Commit**: `6cd24dd`

### 6. Feature: QR Code di Card Detail Modal
- **Lokasi**: Tepat di bawah "Verified Authentic" section
- **Size**: 56x56px, dari endpoint `/api/cards/[tokenId]/qr`
- **Label**: "Scan for Details" + deskripsi
- **File**: `components/CardDetailModal.tsx`
- **Commit**: `739bbe6`
- **Note**: Awalnya ditaruh di CardItem (revert), lalu di Trade page (revert), akhirnya sesuai request user di CardDetailModal

### 7. Trade Page: View Info → CardDetailModal
- **Sebelum**: Custom Quick Info Modal (80 baris kode)
- **Sesudah**: Menggunakan shared `CardDetailModal` component (konsisten dengan Profile/Collection)
- **File**: `app/trade/page.tsx`
- **Commit**: `3479668`

### 8. Trade Page: Hapus Rarity Label
- Label rarity (Common/Rare/Epic/Legendary) dihapus dari card images
- Rarity tetap terlihat di CardDetailModal
- **File**: `app/trade/page.tsx`
- **Commit**: `2de4117`

### 9. Trade Page: Purchase Notification Modal
- **Sebelum**: Browser `alert()` untuk "Purchase successful" dan error
- **Sesudah**: Custom modal — ikon centang hijau (success) atau X pink (error), green/pink glow
- **File**: `app/trade/page.tsx`
- **Commit**: `c5f9000`

### 10. Trade Page: FVM Sort Options + Popular by Wishlist
- **Sort options baru**: "FVM: High to Low", "FVM: Low to High"
- **Popular**: Diubah dari FVM-based ke wishlist-based
- **File**: `app/trade/page.tsx`
- **Commit**: `613a9cb`

### 11. Trade Page: Buy Confirmation Modal
- Konfirmasi sebelum beli: nama kartu, harga, saldo user
- **Jika saldo cukup**: tombol "No" + "Yes, Buy"
- **Jika saldo kurang**: pesan "Insufficient balance" + tombol "Cancel" + "Top Up"
- **File**: `app/trade/page.tsx`
- **Commit**: `a8551f8`

### 12. Performance: Pack Opening Speed
- **Root cause**: API `/api/mint` blocking on `waitForReceipt()` (1-6 detik polling blockchain)
- **Fix**: Hapus blocking `waitForReceipt`, return langsung "pending", background `confirmMint()` fire-and-forget
- **Parallel**: `pickCardTemplate` dan `generateUniqueCardId` dijalankan paralel
- **Sebelum**: ~10-12 detik  |  **Sesudah**: ~2-3 detik
- **File**: `app/api/mint/route.ts`
- **Commit**: `77c034e`

### 13. Bug Fix: Cart/Wishlist tidak cleared saat logout
- **Root cause**: `gachard_cart` dan `gachard_wishlist` di localStorage tidak dihapus saat logout
- **Fix**: Tambah `localStorage.removeItem` untuk cart dan wishlist + dispatch `gachard-cart-change` event
- **File**: `app/profile/page.tsx`
- **Commit**: `93c4f65`

---

## Commits (20 total, 3 revert)

| # | Hash | Message |
|---|------|---------|
| 1 | `1162024` | fix: logout not updating Navbar — dispatch auth-change event |
| 2 | `b4d99f7` | perf: batch FVM queries + add admin clean-slate endpoint |
| 3 | `80725ab` | fix: add GET handler to admin clean-slate endpoint |
| 4 | `5bcdb62` | fix: improve Trade page filter bar (REVERTED) |
| 5 | `3f7d1ca` | Revert filter bar change |
| 6 | `8a270a9` | fix: replace native select with custom sort dropdown |
| 7 | `6cd24dd` | fix: CoreLoop responsive |
| 8 | `6199807` | feat: add QR to Trade page cards (REVERTED) |
| 9 | `e6e2e19` | Revert Trade page QR |
| 10 | `cf23db2` | feat: add QR to CardItem (REVERTED) |
| 11 | `9c9f1f0` | Revert CardItem QR |
| 12 | `739bbe6` | feat: add QR code in CardDetailModal |
| 13 | `3479668` | feat: replace Quick Info Modal with CardDetailModal |
| 14 | `2de4117` | fix: remove rarity label from Trade cards |
| 15 | `c5f9000` | fix: replace alert with custom modal for purchase notif |
| 16 | `613a9cb` | feat: add FVM sort + Popular by wishlist |
| 17 | `5dd9646` | fix: simplify Popular sort label |
| 18 | `a8551f8` | feat: buy confirmation modal with balance check |
| 19 | `77c034e` | perf: speed up pack opening |
| 20 | `93c4f65` | fix: clear cart and wishlist on logout |

---

## Files Changed

| File | Changes |
|------|---------|
| `app/profile/page.tsx` | Logout: auth-change event, clear cart/wishlist |
| `components/Navbar.tsx` | Listen auth-change event |
| `app/api/marketplace/listings/route.ts` | Batch FVM queries |
| `app/api/admin/clean-slate/route.ts` | NEW — clean-slate endpoint |
| `app/trade/page.tsx` | Sort dropdown, CardDetailModal, rarity label, purchase modal, FVM sort, buy confirmation |
| `components/home/HomeCoreLoop.tsx` | Responsive fixes |
| `components/CardDetailModal.tsx` | QR code below Verified Authentic |
| `app/api/mint/route.ts` | Remove blocking waitForReceipt, parallel DB calls |

---

## Admin Credentials (Vercel Production)
- **Username**: `[REDACTED]`
- **Password**: `[REDACTED]`
- **Clean-slate URL**: `https://www.gachard.com/api/admin/clean-slate`

---

## Pelajaran dari Sesi Ini

1. **Custom event pattern** efektif untuk cross-component sync tanpa Context provider (auth-change, gachard-cart-change)
2. **Batch DB queries** — hindari N+1 pattern, gunakan `$in` operator + in-memory processing
3. **Async blockchain pattern (ADR-018)** — jangan block API tunggu receipt, return pending dan confirm di background
4. **User feedback penting** — 3x revert karena salah taruh QR code. Selalu klarifikasi lokasi yang tepat sebelum implement.
5. **Native `<select>` sulit di-style** — custom dropdown lebih konsisten di cross-browser
