# Gachard

Platform TCG digital-native di mana brand/IP dapat menerbitkan kartu (Battle Card / Collection Card) yang bisa dibeli, dikoleksi, dicetak fisik, dan ditukar kembali ke digital — dengan blockchain yang sepenuhnya tersembunyi dari user.

Dibangun untuk submission **Indonesia Web3 Hackathon 2026** (track Consumer Apps, BNB Chain).

## Live Demo

- **App**: https://www.gachard.com
- **Admin Console**: https://www.gachard.com/admin

## Fitur Utama

### Core Loop
- **Login** — Google OAuth + demo account (custodial wallet, tersembunyi dari user)
- **Buy Pack** — Standard (5 kartu/500 Credit) atau Booster (10 kartu/800 Credit)
- **Collect** — Kartu NFT di-mint ke blockchain, disimpan di collection user
- **Print** — Cetak kartu fisik (+$14.99 shipping), kartu terkunci di vault
- **Claim Shipping** — User scan QR code saat terima kartu fisik → status "Real"
- **Redeem** — Masukkan Card ID + Redeem Code dari kartu fisik → kembali ke digital

### Fitur Lainnya
- **Scan & Verify** — Scan QR code untuk verifikasi keaslian kartu
- **Credit System** — Top up credit untuk beli pack
- **Transaction History** — Riwayat semua transaksi di Profile page
- **Unique Card ID** — Setiap kartu punya ID hex unik (e.g. `#8a866`)
- **Invoice ID** — Setiap transaksi punya Invoice ID (e.g. `GC-20260730-a3f1`)
- **Admin Console** — Manage users, transactions, cards, print requests
- **Trade Marketplace** — Jual beli kartu antar user dengan FVM pricing
- **Dismantle & Crystal** — Burn kartu untuk mendapatkan Crystal currency
- **AI Anomaly Detection** — Deteksi wash-trading pada marketplace
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
| Payment | Stripe Test Mode (credit + direct) |
| AI | MiMo V2.5 Pro (risk scoring), Gemini API (market insight) |
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

Lihat `DECISIONS.md` untuk semua 27 ADR.

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
├── .commandcode/      # Command Code config
├── .mimo/             # MiMoCode config
├── .mimocode/         # MiMoCode plugin
├── MEMORY.md          # Project status & rules (auto-loaded)
├── DECISIONS.md       # Architecture decisions (27 ADRs)
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

### Database Scripts
```bash
# Clean slate (hapus semua data testing)
cd frontend && npx tsx scripts/clean-slate.ts
```

## Development Workflow
1. Baca `MEMORY.md` — status & sprint saat ini (auto-loaded oleh MiMoCode)
2. Baca `DECISIONS.md` — keputusan arsitektur yang sudah dikunci (27 ADR)
3. Baca `docs/00-project-overview.md` — problem, solution, scope
4. Baca `PRD-Gachard-Hackathon.md` — PRD lengkap
5. Implement sesuai sprint — jangan menyimpang dari `DECISIONS.md` tanpa ADR baru
6. Commit sering — discipline fallback karena MiMoCode masih alpha

## Catatan untuk AI Coding Agent
- Baca `MEMORY.md`, `DECISIONS.md`, dan `docs/` sebelum membuat perubahan
- Jangan gunakan istilah blockchain/crypto/on-chain di UI user-facing
- Semua perubahan harus kompatibel dengan ADR yang sudah dikunci
- Test di mobile (iPhone 12 Pro/390px, Galaxy S8+/360px) sebelum deploy
- Gunakan `getAuthenticatedUser(req)` untuk semua API routes (server-side session)
- Semua transaksi blockchain menggunakan pola async (ADR-018)

## License
Private — Indonesia Web3 Hackathon 2026 submission.
