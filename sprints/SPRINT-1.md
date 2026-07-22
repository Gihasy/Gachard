# Sprint 1 — Setup & Scaffold (20–26 Juli 2026)

## Goal
Setup fondasi + scaffold aplikasi dasar.

## Tasks
- [x] Install MiMoCode CLI (`curl -fsSL https://mimo.xiaomi.com/install | bash` atau `npm install -g @mimo-ai/cli`)
- [x] `git init` project lokal, buat repo GitHub, `git remote add origin`
- [x] Taruh scaffold (README.md, MEMORY.md, DECISIONS.md, docs/, sprints/) ke folder project, commit awal
- [x] Setup akun hosting: Vercel (frontend+backend) + MongoDB Atlas — free tier
- [ ] ~~Setup wallet testnet + claim faucet~~ → **Pindah ke Sprint 2** (prasyarat smart contract, di luar scope scaffold)
- [x] Scaffold: login Google OAuth, wallet custodial REAL via ethers.js (ADR-002, ADR-017)
- [x] Scaffold: struktur UI kosong (Home / Koleksi / Profil)
- [x] Setup dasar PWA: manifest.json + service worker + icons (192x192, 512x512) (ADR-013)
- [x] Migrasi arsitektur: Next.js API routes = satu-satunya backend (ADR-017), hapus FastAPI
- [x] Implementasi pola async untuk blockchain transactions (ADR-018)
- [x] Implementasi rate-limiting berbasis MongoDB untuk redeem (ADR-019)

## Definition of Done
- Login via Google berhasil, wallet custodial otomatis dibuat dan tersimpan di backend
- UI shell dasar bisa diakses tanpa error
- Repo GitHub sudah berisi scaffold + kode awal, ter-push
- Deployment awal berhasil diakses lewat URL hosting mandiri (boleh versi sangat minimal)

## STOP
Summarize and wait for review.
