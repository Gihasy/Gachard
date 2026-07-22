# Laporan Pre-Sprint 2 — Status & Persiapan
**Tanggal**: 22 Juli 2026
**Sprint aktif**: Sprint 2 — Core Mint (27 Juli – 2 Agustus 2026)
**Tool**: MiMoCode (model mimo-v2.5-pro)
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Laporan ini memuat status terkini project Gachard setelah Sprint 1 selesai dan 4 perbaikan pre-Sprint 2 diterapkan. Tujuannya: review sebelum eksekusi Sprint 2 dimulai.

**Sprint 1**: SELESAI
**Sprint 2**: Belum dimulai (rencana sudah disusun)
**4 perbaikan pre-Sprint 2**: Sudah diterapkan di kode dan dokumentasi

---

## 2. Arsitektur Final

```
┌─────────────────────────────────────────────┐
│  Vercel (single service)                    │
│  ┌─────────────────────────────────────┐    │
│  │  Next.js 16 (App Router)            │    │
│  │  ├─ Pages: /, /login, /koleksi,     │    │
│  │  │         /profil                   │    │
│  │  ├─ API Routes:                     │    │
│  │  │  ├─ POST /api/auth/google        │    │
│  │  │  ├─ GET  /api/health             │    │
│  │  │  ├─ GET  /api/transactions       │    │
│  │  │  └─ POST /api/mint (Sprint 2)    │    │
│  │  └─ Lib:                            │    │
│  │     ├─ mongodb.ts   (DB connection) │    │
│  │     ├─ wallet.ts    (ethers.js)     │    │
│  │     ├─ auth.ts      (Google OAuth)  │    │
│  │     ├─ crypto.ts    (AES-256-GCM)   │    │
│  │     ├─ blockchain.ts (provider)     │    │
│  │     ├─ transactions.ts (async tx)   │    │
│  │     └─ rate-limit.ts (MongoDB)      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   MongoDB Atlas        BNB Testnet
   (users, txns,        (GachardCard.sol)
    rate_limits,         Sprint 2
    odds)
```

---

## 3. Kode yang Sudah Ada (Sprint 1 + 4 Perbaikan)

### 3.1 File Library (`frontend/lib/`)

| File | Fungsi | Status |
|---|---|---|
| `mongodb.ts` | Koneksi MongoDB Atlas (singleton) | Aktif |
| `wallet.ts` | `generateCustodialWallet()` via `ethers.Wallet.createRandom()` | Aktif |
| `auth.ts` | `verifyGoogleToken()` + `getOrCreateUser()` dengan enkripsi private key | Aktif |
| `crypto.ts` | `encrypt()` / `decrypt()` AES-256-GCM | Aktif |
| `blockchain.ts` | `getProvider()` — stub, akan di-expand di Sprint 2 | Aktif (stub) |
| `transactions.ts` | CRUD transaksi + `confirmTransaction()` cek receipt on-chain | Aktif |
| `rate-limit.ts` | `checkRateLimit()` MongoDB-based, 5 attempt/menit | Aktif |
| `api.ts` | Client-side `googleLogin()` helper | Aktif |

### 3.2 API Routes (`frontend/app/api/`)

| Endpoint | Method | Fungsi | Status |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet custodial (terenkripsi) | Aktif |
| `/api/health` | GET | Cek koneksi MongoDB | Aktif |
| `/api/transactions` | GET | Polling status tx + auto-confirm dari receipt on-chain | Aktif |
| `/api/mint` | POST | Mint card + odds table + async tx | **Sprint 2** |

### 3.3 MongoDB Collections

| Collection | Fungsi | Status |
|---|---|---|
| `users` | Data user + wallet address + encrypted private key | Aktif |
| `transactions` | Status transaksi (pending/confirmed/failed) + rarity | Aktif |
| `rate_limits` | Rate-limiting per user per menit | Aktif |
| `odds` | Odds table rarity (bisa override default) | **Sprint 2** |

---

## 4. 4 Perbaikan Pre-Sprint 2

### 4.1 Enkripsi Private Key (ADR-020)

**Apa yang berubah:**
- `lib/crypto.ts` dibuat — AES-256-GCM dengan `ENCRYPTION_SECRET_KEY` dari env var
- `lib/auth.ts` diupdate — `encrypt(wallet.privateKey)` sebelum simpan ke MongoDB
- `lib/blockchain.ts` — admin wallet akan didekripsi saat sign transaksi (`decrypt(encryptedKey)`)
- `.env.local.example` ditambah `ENCRYPTION_SECRET_KEY`

**Alur:**
```
Generate wallet → encrypt(privateKey) → simpan ke MongoDB
                                        ↓
Sign transaksi ← decrypt(encryptedKey) ← baca dari MongoDB
```

**Verifikasi:** Build sukses, TypeScript tidak error.

### 4.2 Rarity Support

**Apa yang berubah di rencana Sprint 2:**

**Smart contract (`GachardCard.sol`):**
- `enum Rarity { Common, Rare, Epic, Legendary }` ditambah
- `mapping(uint256 => Rarity) public cardRarity` ditambah
- `mintCard(address to)` → `mintCard(address to, uint8 rarity)`
- `require(rarity <= 3, "Invalid rarity")` validasi ditambah
- Event `CardMinted` ditambah parameter `rarity`

**Frontend:**
- `lib/odds.ts` (baru) — odds table dari MongoDB (ADR-009), `pickRarity()` weighted random
- `lib/blockchain.ts` — ABI diupdate, `mintCard(toAddress, rarity)`
- `/api/mint` — `pickRarity()` SEBELUM mint, kirim rarity sebagai parameter

**Default odds:** 70% Common / 20% Rare / 8% Epic / 2% Legendary

**Test ditambah:**
- `test_mint_stores_rarity` — verifikasi rarity tersimpan per tokenId
- `test_mint_reverts_on_invalid_rarity` — verifikasi revert untuk rarity > 3

### 4.3 Konfirmasi Transaksi

**Apa yang berubah:**
- `lib/transactions.ts` — fungsi `confirmTransaction(txId)`:
  1. Baca transaksi dari MongoDB
  2. Cek receipt on-chain via `provider.getTransactionReceipt(txHash)`
  3. Jika receipt ada dan `status === 1` → update ke `confirmed`
  4. Jika receipt ada dan `status !== 1` → update ke `failed`
  5. Jika receipt belum ada → tetap `pending`
- `app/api/transactions/route.ts` — saat polling, jika status `pending` dan ada `txHash`, otomatis cek receipt dan update

**Alur:**
```
POST /api/mint → {status: "pending", txId: "abc"}
    ↓
Frontend polling GET /api/transactions?txId=abc setiap 3 detik
    ↓
Backend: status masih pending? → cek receipt on-chain
    ↓
Receipt ada? → update MongoDB → return {status: "confirmed"}
Receipt belum ada? → return {status: "pending"} (polling lanjut)
```

### 4.4 ADR-001 Diperjelas

**Sebelum:** "Kartu sama = fungible dalam rarity yang sama"
**Sesudah:** "BEP-1155 dipilih untuk efisiensi gas batch-operation dan fleksibilitas multi-tipe-token. Setiap kartu mendapat tokenId unik (one-token-per-instance) untuk pelacakan vault per instance. Rarity disimpan sebagai metadata per tokenId, bukan pengelompokan tokenId yang sama."

**Mengapa penting:** Klarifikasi ini mencegah salah paham bahwa kartu Common #1 dan kartu Common #2 bisa dianggap "sama" dan di-balance-merge. Di Gachard, setiap kartu punya identity unik.

---

## 5. Rencana Sprint 2

**Rencana detail:** `docs/compose/plans/2026-07-22-sprint-2-core-mint.md`

| Task | Deskripsi | Estimasi |
|---|---|---|
| 1 | Setup wallet testnet + faucet BNB | ~15 menit (manual) |
| 2 | Setup Foundry project | ~10 menit |
| 3 | Tulis `GachardCard.sol` + test | ~30 menit |
| 4 | Deploy ke BNB Testnet | ~10 menit |
| 5 | Test mint di testnet + verifikasi block explorer | ~15 menit |
| 6 | Integrasi frontend (blockchain.ts + /api/mint + odds.ts) | ~30 menit |
| 7 | Final verification + cleanup | ~15 menit |

**Total estimasi:** ~2 jam (belum termasuk waktu tunggu faucet)

### Definition of Done Sprint 2

| Kriteria | Verifikasi |
|---|---|
| Mint berhasil, token terlihat di block explorer | `cast call` + bscscan.com |
| Status `Digital` tercatat benar per token | `cardStatus(tokenId)` returns 0 |
| Rarity tercatat benar per token | `cardRarity(tokenId)` returns 0-3 |
| Kode ter-push ke GitHub | `git log` |
| Frontend build sukses | `npm run build` |

---

## 6. Environment Variables yang Dibutuhkan

```env
# MongoDB
MONGODB_URL=mongodb+srv://...
DATABASE_NAME=gachard

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Enkripsi (min 32 karakter)
ENCRYPTION_SECRET_KEY=...

# BNB Testnet
ADMIN_WALLET_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
CONTRACT_ADDRESS=0x...  # Setelah deploy (Task 4)
```

---

## 7. ADR Aktif (20 Total)

| ADR | Keputusan Kunci |
|---|---|
| 001 | BEP-1155, one-token-per-instance (diperjelas) |
| 002 | Custodial wallet, tersembunyi dari user |
| 003 | Gas fee disponsori platform |
| 004 | Lock & transfer ke vault, bukan burn |
| 005 | Hash overwrite per siklus print |
| 006 | Redeem rate-limited lewat backend |
| 007 | `recipientAddress` eksplisit |
| 008 | Dual payment: credit vs direct |
| 009 | Odds/rarity di backend, bukan on-chain |
| 010 | Marketplace "Coming Soon" |
| 011 | Artwork AI-generate manual |
| 013 | PWA delivery |
| 014 | Dokumentasi tool-agnostic |
| 015 | MiMoCode sejak awal |
| 017 | Next.js API routes = satu-satunya backend |
| 018 | Pola async untuk blockchain tx |
| 019 | Rate-limiting MongoDB |
| 020 | Enkripsi private key AES-256-GCM |

---

## 8. Risiko & Catatan

1. **Admin private key di env var** — untuk demo hackathon acceptable. Produksi butuh vault service (HashiCorp Vault, AWS Secrets Manager).
2. **`ADMIN_PRIVATE_KEY` di `.env.local`** — ini plaintext di env var, TIDAK dienkripsi (enkripsi hanya untuk key user di MongoDB). Untuk Sprint 2 ini OK karena hanya dipakai di server-side Vercel. Produksi: simpan terenkripsi di MongoDB juga, atau pakai external signer.
3. **Foundry di Windows** — perlu WSL atau Git Bash. Pastikan environment mendukung.
4. **Faucet BNB testnet** — kadang lambat atau habis. Siapkan alternatif: https://testnet.bnbchain.org/faucet-smart-chain
5. **Workshop Sesi 5 (Reading the Chain + Indexing)** — 2 Agustus 2026. Relevan langsung untuk cara baca status NFT dari chain ke UI.

---

## 9. File Inventory

```
D:\Gachard\
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Home
│   │   ├── login/page.tsx              # Login
│   │   ├── koleksi/page.tsx            # Koleksi (placeholder)
│   │   ├── profil/page.tsx             # Profil (placeholder)
│   │   └── api/
│   │       ├── auth/google/route.ts    # Login + wallet
│   │       ├── health/route.ts         # Health check
│   │       └── transactions/route.ts   # Tx polling + auto-confirm
│   ├── components/
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── mongodb.ts                  # DB connection
│   │   ├── wallet.ts                   # Custodial wallet (ethers.js)
│   │   ├── auth.ts                     # Google OAuth + encrypted storage
│   │   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
│   │   ├── blockchain.ts              # Provider (stub, expand Sprint 2)
│   │   ├── transactions.ts            # Async tx + confirmTransaction()
│   │   ├── rate-limit.ts              # MongoDB rate-limiting
│   │   └── api.ts                     # Client-side helpers
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── icons/
│   │       ├── icon-192.png
│   │       └── icon-512.png
│   └── package.json
├── contracts/                          # Akan dibuat Sprint 2 Task 2
├── docs/
│   ├── 00-project-overview.md
│   ├── STATUS-REPORT.md
│   └── compose/
│       ├── plans/
│       │   └── 2026-07-22-sprint-2-core-mint.md
│       └── reports/
│           └── sprint-1-final.md
├── sprints/
│   ├── SPRINT-1.md (selesai)
│   ├── SPRINT-2.md (aktif)
│   └── SPRINT-3.md ... SPRINT-6.md
├── DECISIONS.md                        # 20 ADRs
├── MEMORY.md                           # Sprint 2 aktif
├── CLAUDE.md
├── README.md
└── PRD-Gachard-Hackathon.md
```

---

## 10. Yang Perlu Diputuskan Sebelum Sprint 2

1. **Enkripsi `ADMIN_PRIVATE_KEY`** — saat ini plaintext di env var. Mau dienkripsi juga di MongoDB (konsisten dengan key user), atau tetap di env var saja untuk demo hackathon?

2. **Odds table default** — 70/20/8/2 untuk Common/Rare/Epic/Legendary. Mau diubah?

3. **Foundry vs Hardhat** — rencana pakai Foundry. Ada preferensi lain?

4. **Chain target** — rencana BNB Testnet (chain ID 97). Mau pakai opBNB Testnet juga?

---

*Laporan ini disusun untuk review sebelum eksekusi Sprint 2. Bisa dibaca oleh Claude Code, MiMoCode, atau tool AI lainnya.*
