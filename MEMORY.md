# MEMORY

## Instruksi untuk AI Coding Agent (dibaca otomatis setiap sesi oleh MiMoCode)

Selain file ini, baca juga secara eksplisit di awal sesi:
1. `DECISIONS.md` — seluruh keputusan arsitektur (ADR) yang sudah dikunci
2. `docs/00-project-overview.md` — problem, solution, differentiator, scope
3. `sprints/SPRINT-[N].md` — sprint aktif, ikuti scope-nya secara ketat, gunakan isinya sebagai `/goal` di awal sesi

Jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru. Jangan membangun fitur di luar scope sprint aktif meski tampak berguna.

## Current Sprint
Sprint 3 selesai. Siap Sprint 4 (10–16 Agustus 2026).

## Current Goal
Sprint 4: Sistem credit dual-track + UI utama.

## Project Status
- PRD selesai — lihat `docs/00-project-overview.md` (ringkas) dan `PRD-Gachard-Hackathon.md` (lengkap)
- Tool utama: MiMoCode (model mimo-v2.5-pro, berbayar) sejak awal — TIDAK memakai Emergent (lihat ADR-015)
- Hosting: Vercel (frontend + backend via API routes) + MongoDB Atlas (database), semua free tier
- **Arsitektur final**: Next.js API routes sebagai SATU-SATUNYA backend (lihat ADR-017). FastAPI sudah dihapus.
- **Enkripsi**: Private key + redeem code dienkripsi AES-256-GCM (ADR-020)
- Sprint 1: SELESAI — laporan di `docs/compose/reports/sprint-1-final.md`
- Sprint 2: SELESAI — laporan di `docs/compose/reports/sprint-2-final.md`
- Sprint 3: SELESAI — laporan di `docs/compose/reports/sprint-3-final.md`
  - [x] Smart contract: `requestPrint()` + `redeemCard()` + 24/24 tests
  - [x] Deploy kontrak baru: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637` (BNB Testnet)
  - [x] Full loop mint→print→redeem verified on-chain (3 siklus)
  - [x] API routes: `/api/print`, `/api/redeem` dengan rate-limiting + enkripsi code
  - [x] Hash overwrite verified: kode lama invalid setelah siklus baru (tested on-chain)
- Kontrak aktif: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637`
- Admin wallet: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`
- 9 API routes aktif di Vercel

## Notes
- Solo developer, non-programmer, vibe coding via MiMoCode
- ~14 jam/minggu waktu efektif
- Urutan prioritas potong jika waktu mepet: polish UI/UX → fitur AI vision (fallback ke QR lookup polos) → (core mint–vault–redeem TIDAK BOLEH dipotong)
- Marketplace: UI placeholder "Coming Soon" saja, tidak fungsional untuk hackathon
- Tanggal Demo Day pasti belum diumumkan — cek grup peserta hackathon
- Rencana kerja sama cetak-dan-segel dengan Millennium Print Group (MPG) — hanya untuk tahap produksi, bukan hackathon
- Jalankan `/dream` di akhir setiap sprint untuk merangkum pembelajaran sesi ke file ini
