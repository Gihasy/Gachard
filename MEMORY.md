# MEMORY

## Instruksi untuk AI Coding Agent (dibaca otomatis setiap sesi oleh MiMoCode)

Selain file ini, baca juga secara eksplisit di awal sesi:
1. `DECISIONS.md` — seluruh keputusan arsitektur (ADR) yang sudah dikunci
2. `docs/00-project-overview.md` — problem, solution, differentiator, scope
3. `sprints/SPRINT-[N].md` — sprint aktif, ikuti scope-nya secara ketat, gunakan isinya sebagai `/goal` di awal sesi

Jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru. Jangan membangun fitur di luar scope sprint aktif meski tampak berguna.

## Current Sprint
Sprint 6 selesai. Semua sprint selesai.

## Current Goal
Persiapan Demo Day.

## Project Status
- PRD selesai — lihat `docs/00-project-overview.md` (ringkas) dan `PRD-Gachard-Hackathon.md` (lengkap)
- Tool utama: MiMoCode (model mimo-v2.5-pro, berbayar) sejak awal — TIDAK memakai Emergent (lihat ADR-015)
- Hosting: Vercel (frontend + backend via API routes) + MongoDB Atlas (database), semua free tier
- **Arsitektur final**: Next.js API routes sebagai SATU-SATUNYA backend (lihat ADR-017). FastAPI sudah dihapus.
- **Enkripsi**: Private key + redeem code dienkripsi AES-256-GCM (ADR-020)
- Kontrak aktif: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`
- Admin wallet: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`
- 12 API routes aktif di Vercel, 22 routes total (8 pages + 12 API + middleware)
- Deploy: https://frontend-rosy-pi-88.vercel.app

### Sprint 1-6: SEMUA SELESAI
- Sprint 1: scaffold, login, UI, PWA icons — laporan di `docs/compose/reports/sprint-1-final.md`
- Sprint 2: core mint, smart contract, test mint on-chain — laporan di `docs/compose/reports/sprint-2-final.md`
- Sprint 3: requestPrint + redeemCard, full loop verified — laporan di `docs/compose/reports/sprint-3-final.md`
- Sprint 4: credit system, buy pack, print checkout, UI pages
- Sprint 5: QR codes, /api/scan, scan page, purchasePrice
- Sprint 6: stabilization + pitch deck outline + brand identity (8/8 tasks)
- Brand Identity: SELESAI — CSS variables, Navbar, Home, PackCard, CardItem, TopUp, Scan, Login, Collection, Marketplace, Profile

### Emergent Design Overhaul: SELESAI + AUDITED
- 8 commits from Emergent pulled, merged, deployed (+3470/-482 lines)
- 6-step audit completed: ADR-010 compliant, no credential leak, proxy.ts safe, .emergent/cron inert
- TypeScript fixes applied (scan/page.tsx)
- External logos replaced with local assets (`frontend/public/icons/`)
- `.emergent/cron/` deleted from repo
- Route renames: `/koleksi` → `/collection`, `/profil` → `/profile`

### Google OAuth: IMPLEMENTED, PERLU VERIFIKASI USER
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` set di `.env.local` dan Vercel Production
- Login page menggunakan Google Identity Services SDK (real OAuth, bukan mock)
- Backend decode JWT ID token langsung (bukan Bearer token ke userinfo endpoint)
- Authorized JavaScript origin ditambahkan di Google Cloud Console
- **Status**: Code deployed, user perlu test login + clear cache dulu

### Service Worker: FIXED, DEPLOYED
- sw.js di-fix: cache versioning (`gachard-v2026-07-23-02`), `skipWaiting()`, `activate` event dengan old cache cleanup
- HTML pages: network-first strategy (selalu fetch fresh)
- Static assets: cache-first strategy
- ServiceWorkerRegister.tsx: cache-bust SW registration dengan timestamp
- **Status**: Deployed, user perlu hard refresh atau Incognito untuk verifikasi

### Open Items (belum selesai)
1. **DNS gachard.com** — domain dibeli, ditambahkan ke Vercel, tapi DNS belum dikonfigurasi di registrar (Rumahweb). Perlu: A record @ → 76.76.21.21 + CNAME www → cname.vercel-dns.com
2. **AI Vision (Gemini)** — di-skip untuk hackathon. QR lookup saja sudah cukup. Gemini API key ada tapi quota issues.
3. **Google OAuth verification** — code deployed, user perlu test login setelah clear cache
4. **SW cache verification** — user perlu hard refresh/Incognito untuk verifikasi deployment benar
5. **Demo Day prep** — video backup, pitch deck, rehearsal

## Notes
- Solo developer, non-programmer, vibe coding via MiMoCode
- ~14 jam/minggu waktu efektif
- Urutan prioritas potong jika waktu mepet: polish UI/UX → fitur AI vision (fallback ke QR lookup polos) → (core mint–vault–redeem TIDAK BOLEH dipotong)
- Marketplace: UI placeholder "Coming Soon" saja, tidak fungsional untuk hackathon (ADR-010)
- Tanggal Demo Day pasti belum diumumkan — cek grup peserta hackathon
- Rencana kerja sama cetak-dan-segel dengan Millennium Print Group (MPG) — hanya untuk tahap produksi, bukan hackathon
- Jalankan `/dream` di akhir setiap sprint untuk merangkum pembelajaran sesi ke file ini
- **Routes sudah English**: `/collection` (bukan /koleksi), `/profile` (bukan /profil), `/marketplace`, `/scan`, `/topup`
- **Service Worker**: sw.js sekarang punya cache versioning + network-first untuk HTML. Bump version di sw.js setiap deploy jika ada perubahan UI signifikan.
- **Google OAuth**: Login menggunakan Google Identity Services SDK. Backend decode JWT langsung. Jika login gagal, cek: (1) cache browser, (2) Authorized JavaScript origins di Google Cloud Console, (3) env vars di Vercel.

## Aturan untuk Tool Eksternal (Emergent, AI lain, dll)
WAJIB berikan akses ke file ini SEBELUM meminta tool eksternal mengerjakan apa pun:
1. `MEMORY.md` — status project, sprint, aturan
2. `DECISIONS.md` — 20 ADR yang sudah dikunci
3. `PRD-Gachard-Hackathon.md` — scope, fitur, constraint

Tujuan: mencegah tool yang tidak tahu konteks melanggar keputusan yang sudah dikunci (contoh: ADR-010 marketplace "Coming Soon" dilanggar oleh Emergent yang membuat marketplace fungsional).

## Domain
- Domain: `gachard.com` (dibeli, belum dikonfigurasi DNS)
- DNS yang perlu: A @ 76.76.21.21 + CNAME www cname.vercel-dns.com
- Registrar: Rumahweb
