# Gachard

Platform TCG digital-native di mana brand/IP dapat menerbitkan kartu (Battle Card / Collection Card) yang bisa dibeli, dikoleksi, dicetak fisik, dan ditukar kembali ke digital — dengan blockchain yang sepenuhnya tersembunyi dari user.

Dibangun untuk submission **Indonesia Web3 Hackathon 2026** (track Consumer Apps, BNB Chain).

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier)
- Google Cloud Console OAuth credentials

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables
See `.env.example` in each directory.

## Development Workflow
1. Baca `MEMORY.md` — status & sprint saat ini
2. Baca `DECISIONS.md` — keputusan arsitektur yang sudah dikunci
3. Baca `docs/00-project-overview.md` — problem, solution, scope
4. Baca sprint aktif di `sprints/`
5. Implement sesuai sprint aktif — jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru

## Stack
- **Chain**: BNB Chain Testnet / opBNB Testnet
- **Token**: BEP-1155
- **Wallet**: custodial (dibuat otomatis backend, tersembunyi dari user) + sponsored gas
- **Payment**: Stripe Test Mode — dual-track (credit top-up untuk pack, direct payment untuk print)
- **AI**: QR lookup + vision model untuk fitur scan kartu

## Deployment

### Backend (Render)
1. Buat akun di https://render.com
2. New → Web Service
3. Connect GitHub repo `Gihasy/Gachard`
4. Settings:
   - Name: `gachard-backend`
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `MONGODB_URL`: MongoDB Atlas connection string
   - `DATABASE_NAME`: gachard
6. Create Web Service

### Frontend (Vercel)
1. Buat akun di https://vercel.com
2. New Project
3. Import GitHub repo `Gihasy/Gachard`
4. Settings:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: URL backend Render (e.g., `https://gachard-backend.onrender.com`)
   - `GOOGLE_CLIENT_ID`: Google Client ID
6. Deploy

### Live Demo
- Frontend: (akan diisi setelah deploy)
- Backend API: (akan diisi setelah deploy)
- API Docs: (akan diisi setelah deploy)

## Catatan untuk AI Coding Agent
Sebelum membuat perubahan apa pun, baca `MEMORY.md`, `DECISIONS.md`, dan `docs/` terlebih dahulu.

## Checklist Saat Ganti Model atau Tool
- [ ] Selesaikan fitur yang sedang berjalan dulu — jangan ganti di tengah satu fitur
- [ ] Commit ke Git sebelum ganti (titik rollback aman)
- [ ] Minta model/tool baru menjelaskan pemahamannya dari `MEMORY.md` + `DECISIONS.md` sebelum menulis kode
- [ ] Review diff Git setelah sesi pertama dengan model/tool baru
- [ ] Update `MEMORY.md` "Current Sprint"/"Notes" kalau ada perubahan konteks akibat pergantian ini
