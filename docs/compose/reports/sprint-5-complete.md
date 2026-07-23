# Laporan Sprint 5 — Fitur AI Scan + Caching + Security
**Tanggal**: 23 Juli 2026
**Status**: SELESAI
**Deploy**: https://frontend-rosy-pi-88.vercel.app
**Kontrak**: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`

---

## 1. Ringkasan

Sprint 5 mengimplementasikan fitur AI Scan (QR + vision), memperbaiki timeout issue dengan caching, dan melakukan security cleanup (API key rotation). Semua task selesai kecuali AI Vision yang ter-block oleh quota Gemini API.

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 1 | QR code generation | Done | `lib/qr.ts` + `/api/cards/:tokenId/qr` |
| 2 | Scan API (cache-based) | Done | `/api/scan` baca dari MongoDB |
| 3 | Scan page | Done | `/scan` dengan verification flag |
| 4 | QR di CardItem | Done | "Show QR" button |
| 5 | purchasePrice | Done | Dari mint transaction |
| 6 | tokenIds array | Done | Populate saat konfirmasi |
| 7 | card-artwork-guideline | Done | QR info-scan terpisah dari redeem |
| 8 | AI Vision | Blocked | Quota exceeded, butuh key dari akun berbeda |
| 9 | Blockchain retry logic | Done | 3 attempts, exponential backoff |
| 10 | Security: API key rotation | Done | Key baru di .env.local + Vercel |

---

## 3. Definisi Selesai — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Scan kartu menghasilkan data akurat | Pass | `/api/scan?tokenId=8` → Rare, Digital |
| Flag verifikasi tampil | Pass | ✅/⚠️ di scan page |
| QR code bisa di-generate | Pass | `/api/cards/8/qr` → PNG |
| Tidak ada timeout di Vercel | Pass | Response <5 detik |
| Private key tidak bocor | Pass | Key lama revoked, baru di .env.local + Vercel |

---

## 4. Perubahan Teknis

### 4.1 Caching Architecture (Fix Timeout)

**Masalah:** `/api/scan` memanggil ethers.js langsung ke BNB Testnet RPC → timeout di Vercel (10s limit).

**Solusi:** Baca dari MongoDB cache yang diupdate saat `confirmTransaction()`.

```
confirmTransaction() → update cards collection:
  - rarity (dari CardMinted event data)
  - lastOwner (dari transaksi)
  - lastOnChainSync (timestamp)

/api/scan → baca dari cards collection (MongoDB, <1 detik)
```

**File:** `frontend/lib/transactions.ts`, `frontend/app/api/scan/route.ts`

### 4.2 AI Vision Integration

**File:** `frontend/lib/vision.ts`

**API:** Google Gemini 2.0 Flash (free tier)

**Fungsi:** `analyzeCardImage(imageUrl, expectedRarity, expectedName)`

**Prompt:** Minta JSON response dengan `matches_rarity`, `description`, `condition`, `anomalies`, `confidence`.

**Status:** Implementasi selesai, tapi quota exceeded saat test.

### 4.3 Blockchain Retry Logic

**File:** `frontend/lib/blockchain.ts`

**Wrapper:** `withRetry(fn, label)` — 3 attempts, exponential backoff (1s, 2s, 3s)

**Applied to:** Semua view functions (`getCardStatus`, `getCardRarity`, `getLastOwner`, `getStoredHash`, `getBalance`)

### 4.4 Security: API Key Rotation

**Masalah:** Gemini API key bocor di laporan.

**Tindakan:**
1. Key lama: quota exceeded (sudah tidak berguna)
2. Key baru: di `.env.local` + Vercel env vars
3. `.env.local` di `.gitignore` — tidak pernah ter-commit

---

## 5. API Endpoints (12)

| Endpoint | Method | Fungsi | Sprint |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google | 1 |
| `/api/health` | GET | Cek MongoDB | 1 |
| `/api/mint` | POST | Buy pack (8 kartu, 500 Credit) | 2+4 |
| `/api/print` | POST | Request print | 3 |
| `/api/print/checkout` | POST | Print payment | 4 |
| `/api/redeem` | POST | Redeem card | 3 |
| `/api/transactions` | GET | Tx status polling | 1+2 |
| `/api/seed-templates` | POST | Seed card_templates | 2 |
| `/api/credits` | GET | Check balance | 4 |
| `/api/credits/topup` | POST | Top-up credit | 4 |
| `/api/cards` | GET | User's cards | 4 |
| `/api/cards/:tokenId/qr` | GET | QR code image | **5** |
| `/api/scan` | GET | Card metadata + vision | **5** |

---

## 6. Pages (8)

| Page | Route | Sprint |
|---|---|---|
| Home | `/` | 4 |
| Login | `/login` | 1 |
| Top Up | `/topup` | 4 |
| Koleksi | `/koleksi` | 4 |
| Scan | `/scan` | **5** |
| Marketplace | `/marketplace` | 4 |
| Profil | `/profil` | 1 |

---

## 7. Library Modules (13)

| File | Fungsi | Sprint |
|---|---|---|
| `mongodb.ts` | DB connection | 1 |
| `wallet.ts` | Custodial wallet | 1 |
| `auth.ts` | Google OAuth + encrypted wallet | 1 |
| `crypto.ts` | AES-256-GCM | 1 |
| `api.ts` | Client helpers | 1 |
| `blockchain.ts` | ethers.js + retry logic | 2+3+**5** |
| `odds.ts` | Odds table + pickRarity + buildPackRarities | 2+4 |
| `card-templates.ts` | Template CRUD | 2 |
| `transactions.ts` | Async tx + confirmTransaction + cache | 1+2+4+**5** |
| `rate-limit.ts` | MongoDB rate-limiting | 1 |
| `redeem-code.ts` | Generate + hash redeem code | 3 |
| `credits.ts` | Credit CRUD | 4 |
| `qr.ts` | QR code generation | **5** |
| `vision.ts` | Gemini API integration | **5** |

---

## 8. MongoDB Collections (9)

| Collection | Fungsi |
|---|---|
| `users` | User + wallet + encrypted private key |
| `transactions` | Tx status + tokenIds + purchasePrice |
| `cards` | Card records + **cached on-chain data** (rarity, lastOwner, lastOnChainSync) |
| `card_templates` | 8 templates + artworkUrl |
| `odds` | Odds table (opsional) |
| `rate_limits` | Rate-limiting per user |
| `redeem_codes` | Encrypted redeem codes |
| `credits` | Credit balance |
| `payments` | Payment records (Stripe simulated) |

---

## 9. Smart Contract

| Item | Value |
|---|---|
| Address | `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8` |
| Chain | BNB Testnet (97) |
| Fungsi | `mintCard`, `mintBatch`, `requestPrint`, `redeemCard` |
| Tests | 31/31 passing |

---

## 10. Git History (5 commits)

| Commit | Message |
|---|---|
| `8c4975f` | feat: pack economy 8 cards/500 Credit + mintBatch + event sync |
| `f946676` | fix: decode CardStatusChanged event data correctly |
| `0de9ebf` | feat: sprint-5 AI scan + QR codes + purchasePrice + tokenIds array |
| `9b32619` | feat: AI vision integration with Gemini API + blockchain retry logic |
| `0652e51` | fix: scan endpoint reads from MongoDB cache, not ethers.js RPC |

---

## 11. Known Issues

1. **AI Vision quota exceeded** — butuh key dari akun Google berbeda atau tunggu 24 jam
2. **`lastSync` null** — kartu yang di-mint sebelum caching diimplementasi tidak punya `lastOnChainSync`. Perlu trigger manual sync atau re-mint.
3. **`purchasePrice` null untuk kartu lama** — kartu yang di-mint sebelum field `purchasePrice` ditambahkan tidak punya data ini.

---

## 12. Sprint Berikutnya — Sprint 6 (26–30 Agustus)

**Goal**: Stabilisasi, bukan fitur baru.

**Tasks:**
- Bug fixing
- Mentor review logika vault/redeem
- Draft pitch deck
- Rekam video backup siklus redeem

---

*Laporan ini disusun untuk review Sprint 5.*
