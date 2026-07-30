# Laporan Session 30 Juli 2026 — Gachard Project

**Tanggal**: 30 Juli 2026
**Tool**: MiMoCode (mimo-v2.5-pro)
**Total Commit**: 28
**Total File Berubah**: 19 file (+524 / -169 lines)
**Deploy**: Auto via Vercel (setiap push ke main)

---

## 1. Ringkasan Eksekutif

Sesi ini mencakup 10 area perbaikan dan fitur baru, difokuskan pada **polish UI/UX**, **clean state untuk demo**, dan **integrasi perubahan Emergent**.

| # | Area | Status |
|---|------|--------|
| 1 | Merge & cleanup branch Secondary (Emergent) | ✅ Selesai |
| 2 | Responsive fixes — Profile, Packs, Scan pages | ✅ Selesai |
| 3 | Blockchain terminology audit — semua user-facing pages | ✅ Selesai |
| 4 | Unique Card ID system (hex, non-sequential) | ✅ Selesai |
| 5 | Scan page — Card ID support + retry buttons | ✅ Selesai |
| 6 | Transaction History di Profile page | ✅ Selesai |
| 7 | Invoice ID di Scan result + Profile | ✅ Selesai |
| 8 | Auto-confirm mint transaction | ✅ Selesai |
| 9 | Clean slate database | ✅ Selesai |
| 10 | Copy updates — hero, CTA, play-trade, login | ✅ Selesai |

---

## 2. Branch Management — Emergent Integration

### 2.1 Problem
Branch `Secondary` (Emergent) memiliki perubahan yang belum di-merge ke `main`. Vercel deploy dari `main`, jadi perubahan Emergent tidak terlihat di production.

### 2.2 Perubahan Emergent yang Diterapkan

| File | Perubahan |
|------|-----------|
| `profile/page.tsx` | Top Up button di header actions |
| `packs/page.tsx` | Grid `sm:grid-cols-2` → `md:grid-cols-2`, `max-w-3xl` |

### 2.3 Perubahan Emergent yang Ditolak

| File | Alasan |
|------|--------|
| `PackCard.tsx` (CSS card stack) | User minta rollback — pack images dipertahankan |
| `PackReveal.tsx` (tanpa image) | Ikut rollback bersama PackCard |
| `profile/page.tsx` (hapus responsive) | Responsive fixes dipertahankan |

### 2.4 Branch Cleanup
- Branch `Secondary` dihapus (local + remote)
- Hanya `main` yang tersisa

---

## 3. Responsive Fixes

### 3.1 Profile Page (`profile/page.tsx`)

| Elemen | Sebelum | Sesudah |
|--------|---------|---------|
| Main grid gap | `gap-8` | `gap-4 sm:gap-6 lg:gap-8` |
| Left column spacing | `space-y-6` | `space-y-4 sm:space-y-6` |
| Identity card padding | `p-8` | `p-4 sm:p-6 lg:p-8` |
| Avatar size | `w-20 h-20` | `w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20` |
| Username text | `text-2xl` | `text-lg sm:text-xl lg:text-2xl` |
| Balance section | `p-5` | `p-3 sm:p-4 lg:p-5` |
| Stats card | `p-6` | `p-4 sm:p-6` |
| Card grid gap | `gap-4` | `gap-2.5 sm:gap-4` |

**Target**: iPhone 12 Pro (390px) dan Galaxy S8+ (360px)

### 3.2 Packs Page (`packs/page.tsx`)

| Sebelum | Sesudah |
|---------|---------|
| `sm:grid-cols-2` (side-by-side mulai 640px) | `md:grid-cols-2` (side-by-side mulai 768px) |
| `max-w-4xl` (896px) | `max-w-3xl` (768px) |

---

## 4. Blockchain Terminology Audit

### 4.1 File yang Diperbaiki

| File | Istilah | Perbaikan |
|------|---------|-----------|
| `scan/page.tsx:101` | "on-chain signature" | → "verified signature" |
| `scan/page.tsx:297` | "on-chain record" | → "verified record" |
| `profile/page.tsx:286` | "recorded on-chain" | → "recorded" |
| `marketplace/page.tsx:62` | "on-chain settled" | → "fully verified" |
| `marketplace/page.tsx:66-67` | "on-chain rarity signature", "on-chain tokens" | → "rarity signature", "credits instantly" |
| `marketplace/page.tsx:74` | "on-chain rarity signature" | → "verified rarity signature" |
| `play-trade/page.tsx:82` | "No wallet needed" | → "No setup, no hassle" |
| `play-trade/page.tsx:164` | "verified on-chain" | → "fully verified" |
| `play-trade/page.tsx:198` | "on-chain rarity signature" | → "verified rarity signature" |
| `login/page.tsx:218` | "on-chain wallet + starter credits" | → "demo account instantly" |
| `HomeCtaBand.tsx:30` | "Cosmic Genesis pack" | → "first pack" |
| `HomeHero.tsx:43-48` | "One bond. Infinite legends." | → "One Card. Two Worlds. Always Yours." |
| `CardItem.tsx:98` | comment "on-chain" | → "Request print" |

### 4.2 File yang Tidak Diubah (Admin Only)

| File | Alasan |
|------|--------|
| `admin/page.tsx` | Admin console — istilah teknis diperlukan |

### 4.3 Status: ✅ SEMUA USER-FACING PAGES BERSIH

---

## 5. Unique Card ID System

### 5.1 Design

| Aspek | Detail |
|-------|--------|
| Format | 5-char hex (e.g. `a3f1b`, `8a866`) |
| Generation | `randomBytes(3).toString("hex").slice(0, 5)` |
| Storage | Field `cardId` di MongoDB `cards` collection |
| Display | `Card ID: #a3f1b` (bukan `Card #123`) |

### 5.2 Perubahan

| File | Perubahan |
|------|-----------|
| `api/mint/route.ts` | Generate `cardId` saat mint |
| `api/cards/route.ts` | Return `cardId` di response |
| `components/CardItem.tsx` | Display `Card ID: #XXXXX` |
| `profile/page.tsx` | Pass `cardId` ke CardItem |
| `collection/page.tsx` | Pass `cardId` ke CardItem |
| `scripts/assign-card-ids.mjs` | Assign random Card ID ke existing cards |

### 5.3 Database Update
- 5 kartu existing di-assign random Card ID via script
- Kartu baru otomatis dapat Card ID saat mint

---

## 6. Scan Page Overhaul

### 6.1 Card ID Support

| Sebelum | Sesudah |
|---------|---------|
| URL: `/scan?tokenId=123` | URL: `/scan?cardId=a1b2c3` |
| Input: angka saja | Input: `#` prefix + hex ID |
| API: `?tokenId=X` | API: `?cardId=X` (fallback `?tokenId=X`) |
| Header: "Token #123" | Header: "Card ID: #a1b2c3" |
| Metadata: Card ID #113 | Metadata: Card ID #8a866 |

### 6.2 Error State — Retry Buttons

**Sebelum**: Hanya pesan error, harus kembali ke landing page.

**Sekarang**:
- QR icon button → buka kamera langsung
- Input `#` prefix + "Scan" button → input manual
- Loading spinner + active effect pada button
- Card ID ditampilkan di error message

### 6.3 Input UX

| Halaman | Format |
|---------|--------|
| Landing page | `#` prefix + placeholder `a1b2c3` |
| Error retry | `#` prefix + placeholder `a1b2c3` |
| Button label | "Scan Card" |

---

## 7. Transaction History

### 7.1 Profile Page — New Section

Unified transaction history di bawah collection:
- **Kolom**: Invoice ID, Type, Details, Status, Date
- **Type**: Top Up, Pack, Print, Redeem
- **Details**: Jumlah Credit (top up), jumlah kartu (pack), Card ID (print/redeem)
- **Status**: Success (biru), Processing (gold), Failed (pink)

### 7.2 API Changes

| Endpoint | Perubahan |
|----------|-----------|
| `GET /api/transactions?userId=X` | **BARU** — return semua transaksi user |
| `POST /api/credits/topup` | Catat transaksi type "topup" dengan amount |
| `GET /api/scan` | History include `invoiceId` |

### 7.3 Database Schema

Transaction type ditambah `"topup"`. Field `amount` ditambah ke Transaction interface.

---

## 8. Invoice ID Display

### 8.1 Scan Result Page
- Setiap transaksi di history menampilkan `GC-YYYYMMDD-XXXX`
- Format monospace

### 8.2 Profile Page
- Transaction History menampilkan Invoice ID di kolom pertama

---

## 9. Auto-Confirm Mint Transaction

### 9.1 Problem
Mint API langsung return → kartu "pending" → tidak ada yang trigger konfirmasi on-chain.

### 9.2 Solution

```
Mint API → kirim tx ke blockchain → tunggu receipt (max 8 detik)
  ├─ Receipt diterima → assign tokenId, status "Digital", return
  └─ Timeout → return "pending", frontend bisa poll
```

### 9.3 Implementation

| File | Perubahan |
|------|-----------|
| `api/mint/route.ts` | Tambah `Promise.race` tunggu receipt 8 detik |
| `api/mint/route.ts` | Parse `CardMinted` event logs untuk tokenId + rarity |
| `api/mint/route.ts` | Update cards dengan tokenId, status, rarity, lastOnChainSync |
| `api/mint/route.ts` | Update transaction status ke "confirmed" |

### 9.4 Rarity Parsing Fix

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Semua kartu Legendary | Script manual `confirm-tx.mjs` set rarity = tokenId | Hapus script, fix data manual |
| Scan "data mismatch" | `lastOnChainSync` tidak di-set | Tambah `lastOnChainSync` di auto-confirm |

---

## 10. Copy Updates

### 10.1 Hero Section (`HomeHero.tsx`)

**Sebelum**:
> One bond. Infinite legends.
> Enter the world of Gachard and build your legacy with powerful cards and trusted connections that bridge the physical and digital.

**Sesudah**:
> One Card. Two Worlds. Always Yours.
> Every Gachard card starts digital-native — collect it, play it, and bring it into the real world anytime, with authenticity you can always verify.

### 10.2 CTA Band (`HomeCtaBand.tsx`)

**Sebelum**: "Open your first Cosmic Genesis pack and start building your legacy in the Gachard universe."

**Sesudah**: "Open your first pack and start building your collection."

### 10.3 Play & Trade (`play-trade/page.tsx`)

| Section | Perubahan |
|---------|-----------|
| Free to Play body | "No wallet needed" → "No setup, no hassle" |
| Free to Play checklist #1 | "Instant access — start playing the moment you sign up" → "Instant access once battles go live — no purchase needed" |
| Trade body | "verified on-chain" → "fully verified" |
| Trade - Verified | "on-chain rarity signature" → "verified rarity signature" |

### 10.4 Login Page (`login/page.tsx`)

**Sebelum**: "Spins up a real sandbox account (on-chain wallet + starter credits) — perfect for testing."

**Sesudah**: "Creates a demo account instantly — try packs, cards, and the full experience."

---

## 11. Clean State

### 11.1 Database Reset

| Collection | Sebelum | Sesudah |
|-----------|---------|---------|
| cards | 71 | 0 → 5 (baru) |
| transactions | 13 | 0 → 1 (baru) |
| redeem_codes | 3 | 0 |
| shipping_addresses | 3 | 0 |
| payments | 3 | 0 |
| rate_limits | 0 | 0 |
| counters | ada | reset |
| users | 7 | 7 (kept) |
| card_templates | 8 | 8 (kept) |

### 11.2 Demo Account

Demo accounts sekarang mulai dari **0 credits** (bukan 10,000).

---

## 12. Card Design Unification

### 12.1 Collection Page (CardItem)

| Sebelum | Sesudah |
|---------|---------|
| Border putih | Border warna rarity |
| Tidak ada glow | Rarity glow effect |
| Tidak ada rarity tag | Rarity tag (Common/Rare/Epic/Legendary) |
| `p-3` | `p-2 sm:p-2.5` |

### 12.2 Profile Page

- Menggunakan `CardItem` component (sama dengan collection page)
- Print button langsung berfungsi (shipping form + API call)
- Desain konsisten antar halaman

---

## 13. Miscellaneous Fixes

| Fix | File |
|-----|------|
| Hide number input spin arrows | `globals.css` |
| PackCard rollback (restore images) | `PackCard.tsx`, `PackReveal.tsx`, `packs/page.tsx` |
| Clean-state script | `scripts/clean-state.mjs` |
| Assign Card IDs script | `scripts/assign-card-ids.mjs` |

---

## 14. Database Status (Post-Clean-Slate)

```
Contract: 0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a
Admin Wallet: 0xF7DEd49EB412F69520c38C3f7e36523d71428DEa

Collections:
  users: 7 (kept)
  cards: 5 (new, all Digital)
  transactions: 1 (confirmed mint)
  card_templates: 8 (kept)
  redeem_codes: 0
  rate_limits: 0
  shipping_addresses: 0
  payments: 0
  counters: reset

Cards:
  #37928 | tokenId:112 | Common  | Digital
  #8a866 | tokenId:113 | Rare    | Digital
  #9d894 | tokenId:114 | Common  | Digital
  #3416e | tokenId:115 | Common  | Digital
  #1d565 | tokenId:116 | Rare    | Digital
```

---

## 15. Open Items

| Item | Priority | Status |
|------|----------|--------|
| DNS gachard.com | Medium | Belum dikonfigurasi di registrar |
| Demo Day prep | High | Video, pitch deck, rehearsal |
| AI Vision (Gemini) | High | DITUNDA — WAJIB sebelum submission final |
| Marketplace | Low | UI placeholder "Coming Soon" |

---

## 16. Deploy History (30 Juli 2026)

| # | Commit | Message |
|---|--------|---------|
| 1 | `5981137` | Responsive pack grid |
| 2 | `0e7df49` | Restore PackCard with pack images |
| 3 | `7f71f69` | Apply Emergent design changes |
| 4 | `6508020` | Demo accounts start with 0 credits |
| 5 | `ca43c6a` | Add clean-state script |
| 6 | `7ea2fc9` | Retry buttons on scan error |
| 7 | `5f54c8a` | QR icon + Scan label |
| 8 | `13f722d` | Scan button opens camera |
| 9 | `9be7a03` | Scan button feedback |
| 10 | `a14aa82` | Hide number input spin arrows |
| 11 | `f223607` | Remove blockchain from demo caption |
| 12 | `3533f0c` | Remove Cosmic Genesis references |
| 13 | `7cfac79` | Improve hero tagline |
| 14 | `6856f39` | One Card. Two Worlds. Always Yours. |
| 15 | `33e217c` | Play-trade copy + audit |
| 16 | `2ac04d1` | Invoice ID + Transaction History |
| 17 | `491507a` | Unify card design |
| 18 | `7e54882` | Unique Card ID + Print button |
| 19 | `83c1081` | Print button pending state |
| 20 | `45b6c67` | Scan page Card ID system |
| 21 | `60b2735` | Auto-confirm mint transaction |
| 22 | `0b0cfbb` | Fix scan cardId + lastOnChainSync |
| 23 | `85d6727` | Profile uses CardItem with print flow |

---

*Laporan ini mencakup semua perubahan dari awal sesi hingga commit terakhir (`85d6727`).*
