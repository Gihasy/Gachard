# Laporan Status Lengkap — Gachard
**Tanggal**: 22 Juli 2026, 21:35 WIB
**Sprint aktif**: Sprint 2 (selesai, siap Sprint 3)
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan Eksekutif

Gachard adalah platform TCG digital-native untuk Indonesia Web3 Hackathon 2026. Sprint 1 dan Sprint 2 sudah selesai. Smart contract BEP-1155 sudah ter-deploy di BNB Testnet dan terintegrasi dengan frontend. Arsitektur sudah dimigrasi dari FastAPI terpisah ke Next.js API routes (single service di Vercel). Semua sudah di-commit dan di-push ke GitHub.

---

## 2. Git Status

```
Branch: main
Latest commits:
  33bdc0a feat: add card artwork (9 PNG) + update card_templates artworkUrl
  82f2c3f feat: sprint-2 core mint + architecture migration to Next.js API routes
  93559cf docs: update sprint 1 report with deployment info

Working tree: clean (tidak ada perubahan uncommitted)
Remote: synced dengan origin/main
```

---

## 3. Deploy Status

| Item | Status |
|---|---|
| Vercel production | Active |
| MongoDB Atlas | Connected |
| Health endpoint | `{"status":"ok","database":"connected"}` |
| Semua API routes | Aktif (7 endpoints) |

**Environment variables di Vercel** (semua ter-set):
- `MONGODB_URL` — MongoDB Atlas connection string
- `DATABASE_NAME` — gachard
- `ENCRYPTION_SECRET_KEY` — AES-256-GCM key
- `ADMIN_WALLET_ADDRESS` — wallet baru
- `ADMIN_PRIVATE_KEY` — wallet baru
- `BSC_TESTNET_RPC` — BNB Testnet RPC
- `CHAIN_ID` — 97
- `CONTRACT_ADDRESS` — kontrak baru

---

## 4. Smart Contract

| Item | Value |
|---|---|
| Address | `0xc7d37b43fa706c646f89b19b78b9c2329925731c` |
| Chain | BNB Testnet (97) |
| Explorer | https://testnet.bscscan.com/address/0xc7d37b43fa706c646f89b19b78b9c2329925731c |
| Compiler | Solidity 0.8.24 |
| Framework | Foundry v1.7.1 + OpenZeppelin v5 |
| Tests | 24/24 passing |

**Fungsi aktif:**
- `mintCard(address to, uint8 rarity)` — mint kartu baru, status Digital
- `cardStatus(uint256)` — cek status (0=Digital, 1=Vaulted)
- `cardRarity(uint256)` — cek rarity (0=Common, 1=Rare, 2=Epic, 3=Legendary)
- `storedHash(uint256)` — mapping untuk redeem code hash (Sprint 3)
- `lastOwner(uint256)` — mapping untuk provenance
- `_update()` override — block transfer saat Vaulted

**Mapping yang sudah ada (untuk Sprint 3):**
- `storedHash[tokenId]` → bytes32
- `lastOwner[tokenId]` → address

**Token test ter-mint:**
| Token | Status | Rarity | Owner |
|---|---|---|---|
| 1 | Digital (0) | Common (0) | `0xF7DEd4...28DEa` |
| 2 | Digital (0) | Rare (1) | `0xF7DEd4...28DEa` |
| 3 | Digital (0) | Epic (2) | `0xF7DEd4...28DEa` |

`nextTokenId = 4`

---

## 5. API Endpoints (7 total)

| Endpoint | Method | Fungsi | Sprint |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet custodial (terenkripsi) | 1 |
| `/api/health` | GET | Cek MongoDB connection | 1 |
| `/api/mint` | POST | Mint card (odds + template + async tx) | 2 |
| `/api/transactions` | GET | Polling status tx + auto-confirm dari receipt | 1+2 |
| `/api/seed-templates` | POST | Seed card_templates + update artworkUrl | 2 |
| `/api/print` | POST | **Sprint 3** — trigger requestPrint | — |
| `/api/redeem` | POST | **Sprint 3** — trigger redeemCard + rate-limit | — |

---

## 6. Library Modules (`frontend/lib/`)

| File | Fungsi | Sprint |
|---|---|---|
| `mongodb.ts` | MongoDB Atlas connection (singleton) | 1 |
| `wallet.ts` | Custodial wallet generation (ethers.js) | 1 |
| `auth.ts` | Google OAuth + encrypted wallet storage | 1 |
| `crypto.ts` | AES-256-GCM encrypt/decrypt | 1 |
| `api.ts` | Client-side login helper | 1 |
| `blockchain.ts` | ethers.js provider + contract interaction | 2 |
| `odds.ts` | Odds table + weighted random pickRarity() | 2 |
| `card-templates.ts` | Card template CRUD + seed | 2 |
| `transactions.ts` | Async tx CRUD + confirmTransaction() | 1+2 |
| `rate-limit.ts` | MongoDB-based rate limiting (5/menit) | 1 |

---

## 7. MongoDB Collections

| Collection | Fungsi | Data Aktif |
|---|---|---|
| `users` | User + wallet address + encrypted private key | Ya |
| `transactions` | Tx status (pending/confirmed/failed) | Belum ada data real |
| `cards` | Card record (linked ke tokenId on-chain) | Belum ada data real |
| `card_templates` | 8 template kartu (2 per rarity) + artworkUrl | Ya (di-seed otomatis) |
| `odds` | Odds table (opsional, default hardcoded 70/20/8/2) | Opsional |
| `rate_limits` | Rate-limiting per user per menit | Belum ada data real |
| `redeem_codes` | **Sprint 3** — redeem code terenkripsi | — |

---

## 8. Card Artwork (9 file)

| File | Size | Path di MongoDB |
|---|---|---|
| `common-1.png` | 3.7 MB | `/cards/common-1.png` |
| `common-2.png` | 3.9 MB | `/cards/common-2.png` |
| `rare-1.png` | 4.0 MB | `/cards/rare-1.png` |
| `rare-2.png` | 4.0 MB | `/cards/rare-2.png` |
| `epic-1.png` | 4.1 MB | `/cards/epic-1.png` |
| `epic-2.png` | 4.1 MB | `/cards/epic-2.png` |
| `legendary-1.png` | 4.0 MB | `/cards/legendary-1.png` |
| `legendary-2.png` | 4.2 MB | `/cards/legendary-2.png` |
| `card-back.png` | 4.0 MB | (card back untuk semua kartu) |

Semua file accessible di `https://frontend-rosy-pi-88.vercel.app/cards/` (return 200 OK).

---

## 9. Arsitektur Final

```
┌──────────────────────────────────────────────┐
│  Vercel (single service)                     │
│  ┌──────────────────────────────────────┐    │
│  │  Next.js 16 (App Router)             │    │
│  │  ├─ Pages: /, /login, /koleksi,      │    │
│  │  │         /profil                    │    │
│  │  ├─ API Routes (7 endpoints)         │    │
│  │  └─ Lib (10 modules)                 │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   MongoDB Atlas        BNB Testnet
   (7 collections)      GachardCard.sol
                        0xc7d37b43...
```

---

## 10. ADR Aktif (20)

| ADR | Keputusan |
|---|---|
| 001 | BEP-1155, one-token-per-instance (diperjelas) |
| 002 | Custodial wallet, tersembunyi dari user |
| 003 | Gas fee disponsori platform |
| 004 | Lock & transfer ke vault, bukan burn |
| 005 | Hash overwrite per siklus print |
| 006 | Redeem rate-limited lewat backend (5/menit) |
| 007 | `recipientAddress` eksplisit, bukan `msg.sender` |
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

## 11. Keamanan

| Item | Status |
|---|---|
| `.env.local` di `.gitignore` | Aman (tidak pernah ter-commit) |
| Private key di committed files | Tidak ada |
| `contracts/lib/` di `.gitignore` | Aman |
| `contracts/broadcast/` di `.gitignore` | Aman |
| Wallet lama | Tidak dipakai (sudah di-rotate) |
| Kontrak lama | Tidak dipakai |
| Private key user di MongoDB | Terenkripsi AES-256-GCM |
| Admin private key | Plaintext di env var Vercel (acceptable untuk demo) |

---

## 12. Sprint Status

| Sprint | Status | Catatan |
|---|---|---|
| Sprint 1 | SELESAI | Laporan di `docs/compose/reports/sprint-1-final.md` |
| Sprint 2 | SELESAI | Laporan di `docs/compose/reports/sprint-2-final.md` |
| Sprint 3 | Belum mulai | Rencana di `docs/compose/plans/2026-07-22-sprint-3-vault-print-redeem.md` |
| Sprint 4 | Belum mulai | — |
| Sprint 5 | Belum mulai | — |
| Sprint 6 | Belum mulai | — |

---

## 13. Sprint 2 — Checklist Final

| Task | Status |
|---|---|
| Setup wallet testnet + faucet | Done |
| Setup Foundry project | Done |
| Smart contract `GachardCard.sol` | Done (24/24 tests) |
| Deploy ke BNB Testnet | Done |
| Test mint di testnet (3 kartu) | Done |
| Integrasi frontend `/api/mint` | Done |
| Card artwork (9 PNG) | Done |
| Card templates di MongoDB | Done |
| Rotasi wallet admin | Done |
| Commit ke GitHub | Done (2 commits) |

---

## 14. Sprint 3 — Preview

**Goal**: `requestPrint()` + `redeemCard()` — full loop mint→print→redeem

**Rencana**: `docs/compose/plans/2026-07-22-sprint-3-vault-print-redeem.md`

**8 Task:**
1. Update smart contract — `requestPrint()` + `redeemCard()` + 15 test baru
2. Deploy kontrak baru ke BNB Testnet
3. Update `blockchain.ts` — ABI + fungsi baru
4. Buat `redeem-code.ts` — generate + hash redeem code
5. `POST /api/print` — generate code, hash, mint ke chain, simpan code terenkripsi
6. `POST /api/redeem` — cek rate-limit → hash code → mint ke chain
7. Test end-to-end — mint → print → redeem 3 siklus di testnet
8. Final verification + cleanup

**Perbaikan yang sudah diterapkan di draft kontrak:**
- `requestPrint()` — `onlyOwner` + `ownerAddress` eksplisit (ADR-007)
- `redeemCard()` — status ubah SEBELUM transfer (supaya `_update()` tidak memblokir)
- `VAULT = address(this)` — bukan `address(0xdead)`
- Transfer pakai `_update()` dengan array parameter

---

## 15. Yang Perlu Dilakukan Sekarang

1. **Lanjut Sprint 3** — eksekusi Task 1-8 dari rencana
2. **Generate artwork sungguhan** — update `artworkUrl` di MongoDB jika artwork baru tersedia
3. **Setup Google OAuth real** — update `GOOGLE_CLIENT_ID` di `.env.local` dan Vercel

---

*Laporan ini disusun untuk review sebelum lanjut ke Sprint 3.*
