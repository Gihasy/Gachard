# Laporan Sprint 4 — Sistem Credit & UI Utama
**Tanggal**: 23 Juli 2026
**Status**: SELESAI, ter-deploy
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan Eksekutif

Sprint 4 mengimplementasikan sistem credit dual-track (credit untuk pack, direct payment untuk print) dan UI utama yang bisa dipakai end-to-end: top up credit, beli pack, reveal kartu, lihat koleksi, request print. Semua task selesai dan ter-deploy ke Vercel.

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 0 | `confirmTransaction()` extract tokenId | Done | Decode CardMinted event, update cards collection |
| 1 | Credit system (model + API) | Done | `lib/credits.ts` + 2 API routes |
| 2 | Buy pack deduct credit + refund | Done | `/api/mint` dengan refund tracking |
| 3 | Print checkout (Stripe simulated) | Done | `/api/print/checkout` |
| 4 | Home page + inline reveal | Done | PackCard + artwork display |
| 5 | Top Up page | Done | Preset amounts $5/$10/$20/$50 |
| 6 | Koleksi page + CardItem | Done | Card grid + Request Print button |
| 7 | Marketplace placeholder | Done | "Coming Soon" |
| 8 | Final verification | Done | Build OK, 11 API routes |

---

## 3. Definition of Done — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Top up credit berhasil | Pass | `POST /api/credits/topup` returns `{success, newBalance}` |
| Beli pack memotong saldo credit | Pass | `POST /api/mint` calls `deductCredits()` |
| Request print wajib payment terpisah | Pass | `POST /api/print/checkout` terpisah dari `/api/mint` |
| UI utama end-to-end | Pass | Home → Buy Pack → Reveal → Koleksi → Request Print |
| Marketplace "Coming Soon" | Pass | `/marketplace` page |
| Frontend build sukses | Pass | `npm run build`, 20 routes |

---

## 4. API Endpoints (11 total)

| Endpoint | Method | Fungsi | Sprint |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet | 1 |
| `/api/health` | GET | Cek MongoDB | 1 |
| `/api/mint` | POST | Buy pack (deduct credit + mint + refund) | 2+**4** |
| `/api/print` | POST | Request print (redeem code + chain) | 3 |
| `/api/print/checkout` | POST | Print payment (Stripe simulated) | **4** |
| `/api/redeem` | POST | Redeem card (rate-limit + hash + chain) | 3 |
| `/api/transactions` | GET | Polling status tx + auto-confirm | 1+2+**4** |
| `/api/seed-templates` | POST | Seed card_templates | 2 |
| `/api/credits` | GET | Check credit balance | **4** |
| `/api/credits/topup` | POST | Top-up credit | **4** |
| `/api/cards` | GET | User's cards + artworkUrl lookup | **4** |

---

## 5. Pages (7)

| Page | Route | Fungsi |
|---|---|---|
| Home | `/` | Pack card + buy + inline reveal |
| Login | `/login` | Google OAuth |
| Top Up | `/topup` | Credit top-up ($5/$10/$20/$50) |
| Koleksi | `/koleksi` | Card grid + Request Print button |
| Marketplace | `/marketplace` | Coming Soon placeholder |
| Profil | `/profil` | Placeholder |

---

## 6. Library Modules (11)

| File | Fungsi | Sprint |
|---|---|---|
| `mongodb.ts` | DB connection | 1 |
| `wallet.ts` | Custodial wallet | 1 |
| `auth.ts` | Google OAuth + encrypted wallet | 1 |
| `crypto.ts` | AES-256-GCM | 1 |
| `api.ts` | Client helpers | 1 |
| `blockchain.ts` | ethers.js provider + contract | 2+3 |
| `odds.ts` | Odds table + pickRarity() | 2 |
| `card-templates.ts` | Template CRUD + seed | 2 |
| `transactions.ts` | Async tx + confirmTransaction() + event decode | 1+2+**4** |
| `rate-limit.ts` | MongoDB rate-limiting | 1 |
| `redeem-code.ts` | Generate + hash redeem code | 3 |
| `credits.ts` | Credit balance CRUD | **4** |

---

## 7. Components (3)

| Component | Fungsi |
|---|---|
| `Navbar.tsx` | Navigation (Home, Top Up, Koleksi, Marketplace, Profil) |
| `PackCard.tsx` | Pack display + buy button |
| `CardItem.tsx` | Card display + artwork + Request Print button |

---

## 8. MongoDB Collections (9)

| Collection | Fungsi | Sprint |
|---|---|---|
| `users` | User + wallet + encrypted private key | 1 |
| `transactions` | Tx status + event decoding | 1+2+4 |
| `cards` | Card records (tokenId, templateId, status) | 2+4 |
| `card_templates` | 8 templates + artworkUrl | 2 |
| `odds` | Odds table (opsional) | 2 |
| `rate_limits` | Rate-limiting per user | 1 |
| `redeem_codes` | Encrypted redeem codes | 3 |
| `credits` | Credit balance per user | **4** |
| `payments` | Payment records (Stripe simulated) | **4** |

---

## 9. Key Features Implemented

### 9.1 Credit System
- **Balance**: integer/sen di MongoDB (299 = $2.99)
- **Top-up**: `addCredits()` — upsert, max $100
- **Deduct**: `deductCredits()` — atomic, check balance >= amount
- **Refund**: Jika `mintCard()` gagal setelah `deductCredits()`, saldo dikembalikan. Response include `refunded: boolean` untuk track apakah refund berhasil.

### 9.2 Transaction Confirmation
- `confirmTransaction()` decode `CardMinted` event dari receipt
- Extract `tokenId` dari `topics[1]` (indexed)
- Update `cards` collection: `tokenId` = value sungguhan, `status` = "Digital"
- Dipanggil otomatis oleh `/api/transactions` saat polling

### 9.3 Card Display
- `GET /api/cards` join `cards` dengan `card_templates` untuk `artworkUrl`
- `CardItem` tampilkan artwork, rarity badge, status badge
- Tombol "Request Print" muncul hanya untuk kartu Digital + tokenId terisi

### 9.4 Inline Reveal
- Home page tampilkan kartu yang baru di-reveal secara inline
- Warna border + background sesuai rarity
- Link "Lihat di Koleksi" setelah reveal

---

## 10. Git Status

```
Branch: main
Latest commits:
  dea7fd2 feat: sprint-4 credit system + UI utama complete
  ae5e71f feat: sprint-3 vault/print/redeem state machine complete
  9724604 chore: replace card artwork with smaller file sizes (~1MB each)

Working tree: clean
Remote: synced
```

---

## 11. Sprint Berikutnya — Sprint 5 (17–25 Agustus)

**Goal**: Fitur AI Scan — wajib untuk tema hackathon "AI x Web3"

**Tasks:**
- QR/kode lookup dari kartu ke `tokenId`
- Integrasi AI vision untuk analisis gambar kartu
- Output: rarity, harga terakhir, status vault, riwayat kepemilikan, flag verifikasi
- Test scan menggunakan kartu fisik dari Sprint 3

---

## 12. Yang Perlu Dilakukan

1. **Sprint 5** — AI Scan (QR + vision)
2. **Generate artwork sungguhan** — update `artworkUrl` di MongoDB
3. **Setup Google OAuth real** — update `GOOGLE_CLIENT_ID`
4. **Cetak kartu fisik sample** — printer + kertas foto + stiker scratch-off

---

*Laporan ini disusun untuk review Sprint 4.*
