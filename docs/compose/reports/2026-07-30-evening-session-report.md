# Laporan Detail Sesi 30 Juli 2026 (Part 2 — Malam)

**Tanggal**: 30 Juli 2026, 17:00 - 20:00 WIB
**Tool**: MiMoCode (mimo-v2.5-pro)
**Total Commit**: 35+ (termasuk auto-deploy trigger)
**Total File Berubah**: 50 file (+1,397 / -364 lines)
**Deploy**: Vercel (kena limit free tier, pending besok)

---

## 1. Ringkasan Eksekutif

Sesi malam ini mencakup 12 area perbaikan besar, fokus pada **sistem Claim Shipping**, **auto-confirm transaksi**, **QR Scanner improvement**, **optimasi performa**, dan **admin console enhancements**.

| # | Area | Status |
|---|------|--------|
| 1 | Claim Shipping System (full flow) | ✅ Selesai |
| 2 | Auto-confirm untuk Mint, Print, Redeem | ✅ Selesai |
| 3 | QR Scanner — portal, frame, detection | ✅ Selesai |
| 4 | Optimistic UI Updates (no refresh) | ✅ Selesai |
| 5 | Admin Console improvements | ✅ Selesai |
| 6 | Transaction History fix | ✅ Selesai |
| 7 | Image optimization (PNG → WebP) | ✅ Selesai |
| 8 | Security — maxDuration, unique index | ✅ Selesai |
| 9 | Blockchain terminology audit | ✅ Selesai |
| 10 | Pack reveal — manual open | ✅ Selesai |
| 11 | README update | ✅ Selesai |
| 12 | Vercel deployment config | ⚠️ Pending besok |

---

## 2. Claim Shipping System

### 2.1 Alur Baru

```
User beli pack → Mint → Digital
    ↓
User klik Print → isi alamat → Locked
    ↓
Admin Accept → Processing → Printed → Shipping
    ↓                                    ↓
Admin mark "Shipped"              Generate claimId + QR Code
    ↓
User terima kartu → klik "Claim Shipping" → buka kamera
    ↓
Scan QR Code → verifikasi claimId → status "Real"
    ↓
User bisa Redeem (hanya jika Real)
```

### 2.2 File yang Dibuat/Diubah

| File | Perubahan |
|------|-----------|
| `api/admin/fulfillment/route.ts` | Generate `claimId` saat status "Shipping" |
| `api/claim-shipping/route.ts` | **BARU** — endpoint verifikasi claim |
| `api/claim-qr/[claimId]/route.ts` | **BARU** — QR code untuk claim |
| `api/cards/route.ts` | Return `claimId`, `deliveredAt`, display "Shipping" |
| `api/redeem/route.ts` | Block redeem jika `fulfillmentStatus !== "Real"` |
| `components/CardItem.tsx` | Status badge "Shipping", tombol "Claim Shipping" + QR scanner |
| `admin/page.tsx` | QR Claim Shipping side-by-side, NEW badge, red border |
| `lib/qr.ts` | Update QR generation pakai `cardId` |

### 2.3 Display Status

| fulfillmentStatus | Display | Button |
|-------------------|---------|--------|
| null | Digital | Print |
| Locked/Processing/Printed | In Progress | Requested {date} |
| **Shipping** | **Shipping** | **Claim Shipping** (scan QR) |
| Real | Real | {delivery date} |

---

## 3. Auto-Confirm untuk Semua Transaksi

### 3.1 Implementasi

Semua transaksi sekarang tunggu receipt on-chain (max 8 detik) sebelum return ke frontend.

| Transaksi | File | Event | Auto-Confirm |
|-----------|------|-------|-------------|
| Mint | `api/mint/route.ts` | CardMinted | ✅ |
| Print | `api/print/route.ts` | CardStatusChanged | ✅ |
| Redeem | `api/redeem/route.ts` | CardStatusChanged | ✅ |

### 3.2 Flow

```
API → Kirim tx ke blockchain → Tunggu receipt (max 8 detik)
                                    ↓
                            ┌───────┴───────┐
                            │               │
                      Receipt masuk     Timeout
                      (3-8 detik)       (jarang)
                            ↓               ↓
                   Update DB langsung   Return "pending"
                   Return sukses        Frontend poll nanti
```

### 3.3 Perubahan per File

| File | Perubahan |
|------|-----------|
| `api/mint/route.ts` | Tambah `export const maxDuration = 15`, receipt wait, CardMinted event parsing |
| `api/print/route.ts` | Tambah `maxDuration`, receipt wait, CardStatusChanged event parsing |
| `api/redeem/route.ts` | Tambah `maxDuration`, receipt wait, update `ownerAddress` + `fulfillmentStatus` |

---

## 4. QR Scanner Improvements

### 4.1 Perubahan

| Issue | Fix |
|-------|-----|
| Scanner muncul di frame kartu | Pakai `createPortal` → full-screen overlay |
| Tidak ada visual feedback | Corner markers + scan line animation |
| Detection tidak terlihat | Border hijau + checkmark saat QR terdeteksi |
| Camera tidak terbuka | Dynamic import, simplify constraints, permission check |
| FPS rendah | 10 FPS (dari default) |
| Auto-focus | Hardware feature, sudah aktif otomatis |

### 4.2 Fitur Baru

- **Scan Frame**: Corner markers ungu membantu align QR
- **Scan Line**: Animasi garis scan naik-turun
- **Detection Feedback**: Border hijau + centang hijau
- **URL Parsing**: Support `cardId`, `claimId`, `tokenId` dari QR URL
- **Responsive qrbox**: Ukuran sesuai layar device

---

## 5. Optimistic UI Updates

### 5.1 Perubahan

**Sebelum**: `window.location.reload()` → seluruh halaman refresh

**Sesudah**:

| Aksi | Perubahan UI |
|------|-------------|
| Print | Status langsung "In Progress" |
| Claim Shipping | Status langsung "Real" + timestamp |

### 5.2 Implementasi

- `CardItem` punya state lokal `currentStatus`
- Setelah API sukses → `setCurrentStatus("NewStatus")` → UI update instant
- `onStatusChange` callback → parent update `cards` array
- Tidak ada `window.location.reload()`

---

## 6. Admin Console Improvements

### 6.1 Stats Load

| Sebelum | Sesudah |
|---------|---------|
| Fetch hanya tab aktif | Fetch semua data sekaligus (`Promise.all`) |
| Summary card tampilkan "—" | Tampilkan jumlah aktual langsung |

### 6.2 Cards Table

| Sebelum | Sesudah |
|---------|---------|
| Card ID: `#113` (tokenId) | Card ID: `#8a866` (cardId) |
| Owner: wallet address saja | Owner: username + wallet address |

### 6.3 Print Requests

| Fitur | Detail |
|-------|--------|
| NEW badge | Pink pulsing badge untuk status "Locked" |
| Red border | Pink border untuk request baru |
| QR Codes | Side-by-side: Scan & Verify + Claim Shipping |
| Fulfillment | Hapus "Delivered" text yang overlap dengan "Real" |

### 6.4 Notification

- Summary Card "Pending Prints" punya red pulsing dot
- Muncul ketika ada print request dengan status "Locked"

---

## 7. Transaction History Fix

### 7.1 Issue

- Menampilkan `tokenId` (number) instead of `cardId` (hex)
- Mint transactions menampilkan "—" (tokenId undefined)

### 7.2 Fix

| Sebelum | Sesudah |
|---------|---------|
| Details: `Card #116` | Details: `#1d565` |
| Mint: "—" | Mint: "5 cards" |

### 7.3 API Changes

- `api/transactions/route.ts` — resolve `cardId` dari `tokenId`
- Build `tokenIdToCardId` map dari cards collection
- Return `cardId` dan `cardIds` (untuk mint) di response

---

## 8. Image Optimization

### 8.1 PNG → WebP

| File | PNG | WebP | Penghematan |
|------|-----|------|-------------|
| common-1 | 1,009 KB | 286 KB | -72% |
| common-2 | 1,135 KB | 313 KB | -72% |
| rare-1 | 1,064 KB | 353 KB | -67% |
| rare-2 | 1,031 KB | 348 KB | -66% |
| epic-1 | 1,109 KB | 362 KB | -67% |
| epic-2 | 931 KB | 408 KB | -56% |
| legendary-1 | 1,046 KB | 367 KB | -65% |
| legendary-2 | 1,140 KB | 408 KB | -64% |
| card-back | 870 KB | 212 KB | -76% |
| booster | 555 KB | 77 KB | -86% |
| standard | 487 KB | 59 KB | -88% |

**Total: ~10.3 MB → ~3.2 MB (-69%)**

### 8.2 Next.js Config

```typescript
images: {
  formats: ["image/avif", "image/webp"],
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256],
},
compress: true,
```

---

## 9. Security Items

### 9.1 maxDuration

| Route | maxDuration | Alasan |
|-------|-------------|--------|
| `api/mint/route.ts` | 15 detik | Tunggu receipt 8 detik + buffer |
| `api/print/route.ts` | 15 detik | Sama |
| `api/redeem/route.ts` | 15 detik | Sama |

### 9.2 Unique Card ID Index

- MongoDB unique index pada `cardId` field
- `sparse: true` — allow null values
- Collision retry: `generateUniqueCardId()` — cek DB sebelum insert, max 5 attempts

### 9.3 Admin Credentials

- Middleware 401 tanpa credentials ✅
- Middleware 200 dengan credentials ✅
- Card ownership verified di `/api/print` ✅
- `lib/vision.ts` tidak ada di repo ✅

---

## 10. Blockchain Terminology Audit

### 10.1 File yang Dibersihkan

| File | Istilah | Fix |
|------|---------|-----|
| `scan/page.tsx` | "on-chain signature" | "verified signature" |
| `profile/page.tsx` | "recorded on-chain" | "recorded" |
| `marketplace/page.tsx` | "on-chain settled" | "fully verified" |
| `play-trade/page.tsx` | "No wallet needed" | "No setup, no hassle" |
| `login/page.tsx` | "on-chain wallet" | "demo account instantly" |
| `HomeCtaBand.tsx` | "Cosmic Genesis pack" | "first pack" |
| `HomeHero.tsx` | "One bond. Infinite legends." | "One Card. Two Worlds. Always Yours." |

### 10.2 Status: ✅ SEMUA USER-FACING PAGES BERSIH

Hanya `/admin` yang masih mengandung istilah teknis (sengaja).

---

## 11. Pack Reveal — Manual Open

### 11.1 Perubahan

**Sebelum**: Auto-open setelah 600ms → langsung reveal

**Sesudah**: 
1. User beli pack → muncul overlay sealed pack
2. User klik "Open Pack" → burst animation → kartu reveal

### 11.2 Alasan

User ingin kontrol kapan mau membuka pack. Sealed pack tampil sampai user siap.

---

## 12. Vercel Deployment Config

### 12.1 Issue

- Root Directory salah (`frontend` instead of `.`)
- vercel.json dipindah ke frontend → error
- Kembalikan vercel.json ke root

### 12.2 Status

| Item | Status |
|------|--------|
| vercel.json location | ✅ Root (`D:\Gachard\vercel.json`) |
| vercel.json commands | ✅ `cd frontend && npm run build` |
| Root Directory | ❌ **Harus dikosongkan** di Vercel Dashboard |
| Deploy limit | ❌ Kena 100/hari, tunggu besok |

### 12.3 Yang Perlu Dilakukan Besok

1. Buka Vercel Dashboard → project gachard → Settings → General
2. Root Directory → kosongkan (hapus "frontend")
3. Save
4. Deploy otomatis dari GitHub webhook

---

## 13. Database Status

```
Contract: 0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a
Admin Wallet: 0xF7DEd49EB412F69520c38C3f7e36523d71428DEa

Collections:
  users: 7
  cards: 5 (tokenId 112-116, all Digital/Real)
  transactions: 5 (1 mint, 3 print, 1 redeem — all confirmed)
  card_templates: 8
  redeem_codes: 3
  counters: reset

Cards:
  #37928 | tokenId:112 | Common  | Digital
  #8a866 | tokenId:113 | Rare    | Digital
  #9d894 | tokenId:114 | Common  | Real (claimed)
  #3416e | tokenId:115 | Common  | Digital
  #1d565 | tokenId:116 | Rare    | Real (redeemed)
```

---

## 14. Commit History (30 Juli 2026 — Part 2)

| # | Commit | Message |
|---|--------|---------|
| 1 | `6856f39` | fix: update hero tagline |
| 2 | `3533f0c` | fix: remove Cosmic Genesis references |
| 3 | `f223607` | fix: remove blockchain from demo caption |
| 4 | `a14aa82` | fix: hide number input spin arrows |
| 5 | `9be7a03` | fix: scan button feedback |
| 6 | `13f722d` | fix: scan button opens camera |
| 7 | `5f54c8a` | fix: scan error buttons |
| 8 | `7ea2fc9` | feat: retry buttons on scan error |
| 9 | `ca43c6a` | chore: add clean-state script |
| 10 | `6508020` | fix: demo accounts 0 credits |
| 11 | `83c1081` | fix: Print button pending state |
| 12 | `7e54882` | feat: unique Card ID + Print button |
| 13 | `491507a` | feat: unify card design |
| 14 | `2ac04d1` | feat: Invoice ID + Transaction History |
| 15 | `33e217c` | fix: play-trade copy + audit |
| 16 | `4924ba8` | feat: request timestamp on In Progress |
| 17 | `fdab528` | security: maxDuration + unique index |
| 18 | `86aeeb1` | docs: session report |
| 19 | `85d6727` | fix: profile uses CardItem |
| 20 | `0b0cfbb` | fix: scan cardId + lastOnChainSync |
| 21 | `60b2735` | feat: auto-confirm mint |
| 22 | `45b6c67` | feat: scan Card ID system |
| 23 | `c33bc1a` | fix: remove duplicate In Progress |
| 24 | `2192f2a` | fix: admin shows cardId |
| 25 | `f948655` | fix: QR uses cardId |
| 26 | `03137bb` | fix: admin stats load immediately |
| 27 | `b6c9418` | fix: admin shows username + address |
| 28 | `e0a24b8` | feat: admin QR side by side + NEW badge |
| 29 | `fc02060` | feat: Claim Shipping system |
| 30 | `ad7094e` | fix: Claim requires QR scan |
| 31 | `a8dce23` | fix: Real Card shows delivery date |
| 32 | `8c2c96f` | fix: remove Delivered overlap |
| 33 | `3d16da9` | feat: optimistic UI updates |
| 34 | `5014d75` | fix: QR Scanner portal |
| 35 | `809bf4b` | feat: improved QR scanner |
| 36 | `f31eef6` | fix: QR scanner constraints |
| 37 | `b5ee3aa` | fix: Real Card shows only date |
| 38 | `136135d` | fix: redeem cardId format |
| 39 | `1446d00` | fix: redeem auto-confirm |
| 40 | `8fe2caa` | feat: print auto-confirm |
| 41 | `aa856c9` | perf: WebP optimization |
| 42 | `f185937` | fix: Transaction History cardId |
| 43 | `95c2513` | feat: remove auto-open pack |
| 44 | `4fbe59b` | docs: update README |
| 45 | `e4ddb95` | fix: vercel.json root config |

---

## 15. Known Issues & Next Steps

| Issue | Priority | Status |
|-------|----------|--------|
| Vercel deploy limit | High | Tunggu besok + fix Root Directory |
| Root Directory harus `.` | High | Manual di Vercel Dashboard |
| DNS gachard.com | Medium | Belum dikonfigurasi |
| AI Vision (Gemini) | High | DITUNDA — WAJIB sebelum submission |
| Demo Day prep | High | Video, pitch deck, rehearsal |

---

*Laporan ini mencakup semua perubahan sesi malam (Part 2) dari commit `6856f39` hingga `e4ddb95`.*
