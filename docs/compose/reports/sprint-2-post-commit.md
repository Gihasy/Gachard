# Laporan Sprint 2 — Final (Post-Commit)
**Tanggal**: 22 Juli 2026
**Commit**: `82f2c3f` — 52 files, +4234/-543 lines
**Status**: SELESAI, siap push ke GitHub

---

## 1. Ringkasan Eksekutif

Sprint 2 selesai. Smart contract BEP-1155 untuk mint kartu sudah berfungsi di BNB Testnet dan terintegrasi dengan frontend. Arsitektur juga sudah dimigrasi dari FastAPI terpisah ke Next.js API routes (single service). Semua sudah di-commit, working tree clean.

---

## 2. Sprint 2 — Checklist

| Task | Status |
|---|---|
| Setup wallet testnet + faucet | Done |
| Setup Foundry project | Done |
| Smart contract `GachardCard.sol` | Done (7/7 tests pass) |
| Deploy ke BNB Testnet | Done |
| Test mint di testnet | Done (3 kartu terverifikasi) |
| Integrasi frontend `/api/mint` | Done |
| Commit ke GitHub | Done |

---

## 3. Smart Contract — `GachardCard.sol`

**Address**: `0xc7d37b43fa706c646f89b19b78b9c2329925731c`
**Chain**: BNB Testnet (97)
**Explorer**: https://testnet.bscscan.com/address/0xc7d37b43fa706c646f89b19b78b9c2329925731c

| Fungsi | Status |
|---|---|
| `mintCard(address,uint8)` | Aktif — mint 3 kartu test |
| `cardStatus(uint256)` | Aktif — return Digital(0) |
| `cardRarity(uint256)` | Aktif — return Common/Rare/Epic |
| `_update(...)` override | Aktif — block transfer saat Vaulted |
| `storedHash[tokenId]` | Mapping siap untuk Sprint 3 |
| `lastOwner[tokenId]` | Mapping siap untuk Sprint 3 |

**State machine**: `Digital → (requestPrint) → Vaulted → (redeemCard) → Digital`

---

## 4. On-Chain Verification

| Token | Status | Rarity | Owner |
|---|---|---|---|
| 1 | Digital (0) | Common (0) | `0xF7DEd4...28DEa` |
| 2 | Digital (0) | Rare (1) | `0xF7DEd4...28DEa` |
| 3 | Digital (0) | Epic (2) | `0xF7DEd4...28DEa` |

`nextTokenId = 4` — 3 kartu sudah di-mint.

---

## 5. API Endpoints

| Endpoint | Method | Fungsi | Status |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet | Aktif |
| `/api/health` | GET | Cek MongoDB | Aktif |
| `/api/mint` | POST | Mint card (odds + template + async) | **Baru** |
| `/api/transactions` | GET | Polling status tx + auto-confirm | **Baru** |

---

## 6. Library Modules (`frontend/lib/`)

| File | Fungsi | Sprint |
|---|---|---|
| `mongodb.ts` | MongoDB connection | 1 |
| `wallet.ts` | Custodial wallet (ethers.js) | 1 |
| `auth.ts` | Google OAuth + encrypted storage | 1 |
| `crypto.ts` | AES-256-GCM encrypt/decrypt | 1 |
| `api.ts` | Client-side helpers | 1 |
| `blockchain.ts` | ethers.js provider + contract | **2** |
| `odds.ts` | Odds table + pickRarity() | **2** |
| `card-templates.ts` | Card template CRUD | **2** |
| `transactions.ts` | Async tx + confirmTransaction() | 1+**2** |
| `rate-limit.ts` | MongoDB rate-limiting | 1 |

---

## 7. MongoDB Collections

| Collection | Fungsi | Data Aktif |
|---|---|---|
| `users` | User + wallet | Ya |
| `transactions` | Tx status (pending/confirmed/failed) | Belum ada data real |
| `cards` | Card record (linked ke tokenId) | Belum ada data real |
| `card_templates` | Template kartu (8 placeholder) | Akan di-seed saat mint pertama |
| `odds` | Odds table (opsional, default hardcoded) | Opsional |
| `rate_limits` | Rate-limiting per user | Belum ada data real |

---

## 8. Arsitektur Final

```
┌──────────────────────────────────────────────┐
│  Vercel (single service)                     │
│  ┌──────────────────────────────────────┐    │
│  │  Next.js 16 (App Router)             │    │
│  │  ├─ Pages: /, /login, /koleksi,      │    │
│  │  │         /profil                    │    │
│  │  ├─ API Routes:                      │    │
│  │  │  ├─ POST /api/auth/google         │    │
│  │  │  ├─ GET  /api/health              │    │
│  │  │  ├─ POST /api/mint                │    │
│  │  │  └─ GET  /api/transactions        │    │
│  │  └─ Lib: mongodb, wallet, auth,      │    │
│  │     crypto, blockchain, odds,        │    │
│  │     card-templates, transactions,    │    │
│  │     rate-limit, api                  │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   MongoDB Atlas        BNB Testnet
   (users, txns,        GachardCard.sol
    cards, templates,    0xc7d37b43...
    odds, rate_limits)
```

---

## 9. ADR Aktif (20)

| ADR | Keputusan |
|---|---|
| 001 | BEP-1155, one-token-per-instance |
| 002 | Custodial wallet, tersembunyi |
| 003 | Gas fee disponsori platform |
| 004 | Lock & transfer ke vault, bukan burn |
| 005 | Hash overwrite per siklus print |
| 006 | Redeem rate-limited lewat backend |
| 007 | `recipientAddress` eksplisit |
| 008 | Dual payment: credit vs direct |
| 009 | Odds/rarity di backend |
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

## 10. Git Status

```
Branch: main
Ahead of origin: 1 commit
Working tree: clean

Latest commit:
82f2c3f feat: sprint-2 core mint + architecture migration to Next.js API routes
  52 files changed, 4234 insertions(+), 543 deletions(-)
```

**Belum di-push** — perlu `git push` untuk sync ke GitHub.

---

## 11. Keamanan

| Item | Status |
|---|---|
| `.env.local` di `.gitignore` | Aman |
| Private key di committed files | Tidak ada |
| `contracts/lib/` di `.gitignore` | Aman |
| `contracts/broadcast/` di `.gitignore` | Aman |
| Wallet lama | Tidak dipakai |
| Kontrak lama | Tidak dipakai |

---

## 12. Sprint Berikutnya — Sprint 3 (Vault/Print/Redeem)

**Goal**: Mekanisme lock-vault-redeem — bagian paling kritis dari keseluruhan produk.

**Tasks**:
- `requestPrint()` — generate kode+hash baru, overwrite hash lama, status → Vaulted
- `redeemCard()` — cek status+hash, transfer ke recipientAddress, rate-limiting
- Test end-to-end: mint → print → redeem (2-3 siklus)
- Mulai cetak kartu fisik sample

**Rencana detail**: `docs/compose/plans/` (belum dibuat)

---

## 13. Yang Perlu Dilakukan Sekarang

1. **Push ke GitHub** — `git push origin main`
2. **Lanjut Sprint 3** — `requestPrint()` + `redeemCard()`
3. **Generate artwork** — update `artworkUrl` di MongoDB `card_templates`
4. **Setup Google OAuth** — update `GOOGLE_CLIENT_ID` di `.env.local`

---

*Laporan ini disusun untuk review post-commit Sprint 2.*
