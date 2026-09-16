# Gachard

Platform TCG digital-native di mana brand/IP dapat menerbitkan kartu (Battle Card / Collection Card) yang bisa dibeli, dikoleksi, dicetak fisik, dan ditukar kembali ke digital — dengan blockchain yang sepenuhnya tersembunyi dari user.

Dibangun untuk submission **Indonesia Web3 Hackathon 2026** (track Consumer Apps, BNB Chain).

## Live Demo

- **App**: https://www.gachard.com
- **Admin Console**: https://www.gachard.com/admin

## Fitur Utama

### Core Loop
- **Login** — Google OAuth + demo account (custodial wallet, tersembunyi dari user)
- **Buy Pack** — Standard (5 kartu / 500 Credit, 1 jaminan Rare+) atau Booster (10 kartu / 800 Credit, 2 jaminan Rare+)
- **Collect** — Kartu NFT di-mint ke blockchain, disimpan di collection user
- **Print** — Cetak kartu fisik (+$14.99 shipping), kartu terkunci di vault
- **Claim Shipping** — User scan QR code saat terima kartu fisik → status "Physical"
- **Redeem** — Masukkan Card ID + Redeem Code dari kartu fisik → kembali ke digital

### Fitur Lainnya
- **Scan & Verify** — Scan QR code untuk verifikasi keaslian kartu
- **Credit System** — Top up credit untuk beli pack
- **Transaction History** — Riwayat semua transaksi di Profile page
- **Unique Card ID** — Setiap kartu punya ID hex unik (e.g. `#8a866`)
- **Invoice ID** — Setiap transaksi punya Invoice ID (e.g. `GC-20260730-a3f1`)
- **Admin Console** — Manage users, transactions, cards, print requests
- **Trade Marketplace** — Jual beli kartu antar user dengan Crystal, harga dipandu FVM (Fair Value Market), fee 8%
- **Dismantle & Crystal** — Burn kartu untuk mendapatkan Crystal currency
- **AI Anomaly Detection** — Deteksi wash-trading pada marketplace, hasilnya dicatat on-chain (Oracle)
- **Become a Creator** — Form whitelist untuk IP owner di `/creators`
- **Support Gachard** — Floating CTA button untuk early supporters

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Google Cloud Console OAuth credentials

### Frontend + Backend (Single Service)
```bash
cd frontend
npm install
npm run dev
```

Backend berjalan lewat Next.js API routes (`app/api/`) — tidak ada service terpisah.

### Smart Contracts (Foundry)
```bash
cd contracts
forge install
forge build
forge test
```

### Environment Variables
Lihat `frontend/.env.local.example`.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes (single service) |
| Database | MongoDB Atlas (free tier) |
| Blockchain | BNB Chain Testnet, BEP-1155 |
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5 |
| Wallet | Custodial (ethers.js v6), sponsored gas |
| Auth | Google OAuth + demo accounts |
| Payment | Disimulasikan (belum ada integrasi Stripe sungguhan) |
| AI | MiMo V2.5 Pro (risk scoring), Gemini API (market insight + price suggestion) |
| Hosting | Vercel (frontend + backend), Vercel Edge |

## Architecture

### Key Design Decisions
- **ADR-002**: Wallet custodial, tersembunyi dari user
- **ADR-003**: Gas fee disponsori platform
- **ADR-004**: Lock in-place via status flag (bukan burn)
- **ADR-017**: Next.js API routes sebagai satu-satunya backend
- **ADR-018**: Async pattern untuk transaksi blockchain
- **ADR-020**: AES-256-GCM encryption untuk private key
- **ADR-024**: Marketplace fungsional (trade system)
- **ADR-025**: AI Anomaly Detection Oracle
- **ADR-026**: Dismantle & Crystal (burn-to-earn)
- **ADR-027**: Become a Creator (whitelist form)
- **ADR-028**: Status terminal kartu — klaim atomik + guard anti-timpa
- **ADR-029**: Tool development pindah ke Claude Code

Lihat `DECISIONS.md` untuk semua ADR (001–029).

### Project Structure
```
Gachard/
├── frontend/           # Next.js app (single service)
│   ├── app/           # Pages & API routes
│   ├── components/    # React components
│   ├── lib/           # Utilities & blockchain
│   ├── hooks/         # React hooks
│   └── public/        # Static assets
├── contracts/         # Solidity smart contracts (Foundry)
├── docs/              # Documentation
│   ├── compose/       # Session & feature reports
│   └── archive/       # Historical documentation
├── sprints/           # Scope sprint 1-6 (historis, semua selesai)
├── .mimo/             # Artefak MiMoCode (historis, tidak aktif)
├── .mimocode/         # Artefak MiMoCode (historis, tidak aktif)
├── MEMORY.md          # Project status & rules
├── DECISIONS.md       # Architecture decisions (ADR-001 s/d ADR-029)
├── PRD-Gachard-Hackathon.md  # Product Requirements Document
└── vercel.json        # Vercel deployment config
```

## Deployment

### Vercel
1. Push ke `main` branch → auto-deploy
2. Settings:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
3. Environment Variables:
   - `MONGODB_URL` — MongoDB Atlas connection string
   - `DATABASE_NAME` — gachard
   - `GOOGLE_CLIENT_ID` — Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
   - `CONTRACT_ADDRESS` — Smart contract address
   - `ADMIN_WALLET_ADDRESS` — Admin wallet address
   - `ADMIN_PRIVATE_KEY` — Admin wallet private key
   - `BSC_TESTNET_RPC` — BNB Testnet RPC URL
   - `ENCRYPTION_SECRET_KEY` — AES-256-GCM key (min 32 chars)
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Admin console credentials
   - `CHAIN_ID` — 97 (BNB Testnet)
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` — Contract address untuk client-side
   - `GEMINI_API_KEY` — Market insight + price suggestion
   - `MIMO_API_KEY` / `MIMO_BASE_URL` — AI risk scoring (anomaly detection)

### Database Scripts
```bash
# Clean slate (hapus semua data testing)
cd frontend && npx tsx scripts/clean-slate.ts
```

## Development Workflow
1. Baca `MEMORY.md` — status project & sesi terakhir
2. Baca `DECISIONS.md` — keputusan arsitektur yang sudah dikunci (ADR-001 s/d ADR-029)
3. Baca `docs/00-project-overview.md` — problem, solution, scope
4. Baca `PRD-Gachard-Hackathon.md` — PRD lengkap (historis; lihat blok Amendments)
5. Jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru
6. Commit sering

Sprint 1–6 sudah selesai. `sprints/SPRINT-*.md` adalah catatan sejarah, bukan pekerjaan aktif.
Tool development saat ini: **Claude Code** (ADR-029).

## Blockchain Verification
Semua transaksi blockchain dapat diverifikasi di BSCScan:
- **Smart Contract**: `0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4` (AI Anomaly Detection Oracle)
- **Admin Wallet**: `0x3F4CBDCb5bFb014d63C07400DcD11513DB5F7b56`
- **Chain**: BNB Testnet (Chain ID 97)
- **Explorer**: https://testnet.bscscan.com

Admin Console (https://www.gachard.com/admin) menampilkan:
- Semua transaksi dengan txHash yang bisa diklik ke BSCScan
- Wallet address setiap user
- Token ID setiap kartu di blockchain
- Risk score dari AI anomaly detection

## Catatan untuk AI Coding Agent
- Baca `CLAUDE.md`, `MEMORY.md`, dan `DECISIONS.md` sebelum membuat perubahan
- Jangan gunakan istilah blockchain/crypto/on-chain di UI user-facing
- Semua perubahan harus kompatibel dengan ADR yang sudah dikunci
- Test di mobile (iPhone 12 Pro/390px, Galaxy S8+/360px) sebelum deploy — ada blok budget performa mobile di `app/globals.css`
- Gunakan `getAuthenticatedUser(req)` untuk semua API routes (server-side session)
- Semua transaksi blockchain menggunakan pola async (ADR-018)
- Rekonsiliasi tidak boleh menimpa status terminal seperti `Burned` (ADR-028)
- `tokenId` tidak unik lintas kontrak — query kartu pakai `cardId`

## License
Private — Indonesia Web3 Hackathon 2026 submission.
