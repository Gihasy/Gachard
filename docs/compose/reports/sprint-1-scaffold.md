---
feature: sprint-1-scaffold
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-07-22-sprint-1-scaffold.md
branch: main
commits: 4ba2b47..c09357c
---

# Sprint 1 — Setup & Scaffold Final Report

## What Was Built

Sprint 1 berhasil membangun fondasi aplikasi Gachard: Next.js frontend dengan halaman Home, Koleksi, dan Profil; API routes untuk Google OAuth login dan custodial wallet generation; serta setup PWA dengan manifest.json dan service worker.

Aplikasi sudah di-deploy ke Vercel dan bisa diakses di: **https://frontend-rosy-pi-88.vercel.app**

## Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 dengan App Router dan TypeScript
- **Styling**: Tailwind CSS
- **Pages**: Home (`/`), Koleksi (`/koleksi`), Profil (`/profil`), Login (`/login`)
- **Components**: Navbar dengan status login
- **PWA**: manifest.json + service worker untuk offline capability

### Backend (FastAPI)
- **Framework**: FastAPI dengan Python
- **Database**: MongoDB Atlas (via motor async driver)
- **Auth**: Google OAuth token verification
- **Wallet**: Custodial wallet generation menggunakan web3.py (ADR-002)
- **API Endpoints**: 
  - `POST /auth/google` — Login dengan Google token
  - `GET /auth/me` — Get current user (placeholder)
  - `GET /health` — Health check

### Data Flow
1. User klik "Login dengan Google" di frontend
2. Frontend mengirim Google token ke backend
3. Backend verifikasi token dengan Google API
4. Backend buat user baru dengan wallet custodial jika belum ada
5. Backend simpan user data (termasuk private key) di MongoDB
6. Frontend simpan user info di localStorage

## Design Decisions

- **Custodial Wallet**: Private key disimpan di server, user tidak pernah melihat wallet address (ADR-002)
- **Google OAuth**: Menggunakan token verification langsung ke Google API, bukan SDK
- **PWA**: Manifest dan service worker untuk installability dan offline capability (ADR-013)
- **MongoDB Atlas**: Free tier untuk skala demo hackathon

## Usage

### Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
```

### Environment Variables
- Frontend: `NEXT_PUBLIC_API_URL`, `GOOGLE_CLIENT_ID`
- Backend: `MONGODB_URL`, `DATABASE_NAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### API Endpoints
- `POST /auth/google` — Login dengan Google token
- `GET /health` — Health check

## Verification

- [x] Frontend build berhasil tanpa error
- [x] Semua halaman (Home, Koleksi, Profil, Login) bisa diakses
- [x] Backend API berfungsi (login, health check)
- [x] Wallet generation berfungsi
- [x] Kode di-push ke GitHub
- [x] Deploy ke Vercel berhasil
- [x] Live URL bisa diakses: https://frontend-rosy-pi-88.vercel.app

## Journey Log

- [lesson] Next.js App Router memerlukan `viewport` export terpisah untuk `themeColor`
- [lesson] Git tidak track direktori kosong — perlu file di dalamnya
- [lesson] Python dependencies perlu diinstall via `python -m pip` di environment ini
- [pivot] Menggunakan Next.js API routes daripada backend terpisah untuk deployment yang lebih sederhana

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-07-22-sprint-1-scaffold.md` | Implementation plan | 7 tasks, semua selesai |
| `DECISIONS.md` | Architecture decisions | ADR-002, ADR-013 relevan |
| `sprints/SPRINT-1.md` | Sprint definition | Definition of Done |
