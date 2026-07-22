# Sprint 1 — Setup & Scaffold (20–26 Juli 2026)

## Goal
Setup fondasi + scaffold aplikasi dasar.

## Tasks
- [ ] Install MiMoCode CLI (`curl -fsSL https://mimo.xiaomi.com/install | bash` atau `npm install -g @mimo-ai/cli`)
- [ ] Setup akun Xiaomi MiMo Platform (atau custom provider pihak ketiga) untuk akses berbayar model `mimo-v2.5-pro`
- [ ] `git init` project lokal, buat repo GitHub, `git remote add origin`
- [ ] Taruh scaffold (README.md, MEMORY.md, DECISIONS.md, docs/, sprints/) ke folder project, commit awal
- [ ] Setup akun hosting: Vercel (frontend), Render/Railway (backend), MongoDB Atlas (database) — free tier
- [ ] Setup wallet testnet + claim faucet BNB testnet/opBNB
- [ ] Scaffold: login Google OAuth, wallet custodial otomatis di backend (lihat ADR-002)
- [ ] Scaffold: struktur UI kosong (Home / Koleksi / Profil)
- [ ] Setup dasar PWA: manifest.json (nama, ikon, warna tema dari logo Gachard) + service worker sederhana (lihat ADR-013)

## Definition of Done
- Login via Google berhasil, wallet custodial otomatis dibuat dan tersimpan di backend
- UI shell dasar bisa diakses tanpa error
- Repo GitHub sudah berisi scaffold + kode awal, ter-push
- Deployment awal berhasil diakses lewat URL hosting mandiri (boleh versi sangat minimal)

## STOP
Summarize and wait for review.
