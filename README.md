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
| Frontend | Next.js 16 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas |
| Blockchain | BNB Chain Testnet, BEP-1155 |
| Wallet | Custodial (ethers.js), sponsored gas |
| Auth | Google OAuth + demo accounts |
| Payment | Stripe Test Mode (credit + direct) |
| Hosting | Vercel (frontend + backend), Vercel Edge |

## Architecture

### Key Design Decisions
- **ADR-002**: Wallet custodial, tersembunyi dari user
- **ADR-003**: Gas fee disponsori platform
- **ADR-004**: Lock in-place via status flag (bukan burn)
- **ADR-017**: Next.js API routes sebagai satu-satunya backend
- **ADR-018**: Async pattern untuk transaksi blockchain
- **ADR-020**: AES-256-GCM encryption untuk private key

Lihat `DECISIONS.md` untuk semua ADR.

### Project Structure
```
Gachard/
├── frontend/           # Next.js app
│   ├── app/           # Pages & API routes
│   ├── components/    # React components
│   ├── lib/           # Utilities & blockchain
│   └── public/        # Static assets
├── contracts/         # Solidity smart contracts
├── docs/              # Documentation
├── sprints/           # Sprint plans
├── MEMORY.md          # Project status & rules
└── DECISIONS.md       # Architecture decisions
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
cd frontend && node scripts/clean-state.mjs
```

## Development Workflow
1. Baca `MEMORY.md` — status & sprint saat ini
2. Baca `DECISIONS.md` — keputusan arsitektur yang sudah dikunci
3. Baca `docs/00-project-overview.md` — problem, solution, scope
4. Implement sesuai sprint — jangan menyimpang dari `DECISIONS.md` tanpa ADR baru
5. Commit sering — discipline fallback karena MiMoCode masih alpha

## Catatan untuk AI Coding Agent
- Baca `MEMORY.md`, `DECISIONS.md`, dan `docs/` sebelum membuat perubahan
- Jangan gunakan istilah blockchain/crypto/on-chain di UI user-facing
- Semua perubahan harus kompatibel dengan ADR yang sudah dikunci
- Test di mobile (iPhone 12 Pro/390px, Galaxy S8+/360px) sebelum deploy

## License
Private — Indonesia Web3 Hackathon 2026 submission.
