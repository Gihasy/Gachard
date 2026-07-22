# Gachard

Platform TCG digital-native di mana brand/IP dapat menerbitkan kartu (Battle Card / Collection Card) yang bisa dibeli, dikoleksi, dicetak fisik, dan ditukar kembali ke digital — dengan blockchain yang sepenuhnya tersembunyi dari user.

Dibangun untuk submission **Indonesia Web3 Hackathon 2026** (track Consumer Apps, BNB Chain).

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
Setelah clone, install dependencies kontrak sebelum compile/test:
```bash
cd contracts
forge install
```

Lihat `contracts/foundry.toml` untuk konfigurasi.

### Environment Variables
Lihat `frontend/.env.local.example`.

## Development Workflow
1. Baca `MEMORY.md` — status & sprint saat ini
2. Baca `DECISIONS.md` — keputusan arsitektur yang sudah dikunci
3. Baca `docs/00-project-overview.md` — problem, solution, scope
4. Baca sprint aktif di `sprints/`
5. Implement sesuai sprint aktif — jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru

## Stack
- **Frontend + Backend**: Next.js 16 (App Router) + API Routes
- **Chain**: BNB Chain Testnet / opBNB Testnet
- **Token**: BEP-1155
- **Wallet**: custodial (ethers.js, dibuat otomatis, tersembunyi dari user) + sponsored gas
- **Database**: MongoDB Atlas
- **Payment**: Stripe Test Mode — dual-track (credit top-up untuk pack, direct payment untuk print)
- **AI**: QR lookup + vision model untuk fitur scan kartu

## Deployment

### Vercel (Single Service)
1. Buat akun di https://vercel.com
2. New Project → Import GitHub repo `Gihasy/Gachard`
3. Settings:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
4. Add Environment Variables:
   - `MONGODB_URL`: MongoDB Atlas connection string
   - `DATABASE_NAME`: gachard
   - `GOOGLE_CLIENT_ID`: Google Client ID
   - `GOOGLE_CLIENT_SECRET`: Google Client Secret
5. Deploy

### Live Demo
- **App**: https://frontend-rosy-pi-88.vercel.app
- **API Health**: https://frontend-rosy-pi-88.vercel.app/api/health
- **Login Endpoint**: POST https://frontend-rosy-pi-88.vercel.app/api/auth/google

## Catatan untuk AI Coding Agent
Sebelum membuat perubahan apa pun, baca `MEMORY.md`, `DECISIONS.md`, dan `docs/` terlebih dahulu.

## Checklist Saat Ganti Model atau Tool
- [ ] Selesaikan fitur yang sedang berjalan dulu — jangan ganti di tengah satu fitur
- [ ] Commit ke Git sebelum ganti (titik rollback aman)
- [ ] Minta model/tool baru menjelaskan pemahamannya dari `MEMORY.md` + `DECISIONS.md` sebelum menulis kode
- [ ] Review diff Git setelah sesi pertama dengan model/tool baru
- [ ] Update `MEMORY.md` "Current Sprint"/"Notes" kalau ada perubahan konteks akibat pergantian ini
