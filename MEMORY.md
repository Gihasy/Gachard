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
- Sprint 1: SELESAI — laporan di `docs/compose/reports/sprint-1-final.md`
- Sprint 2: SELESAI — laporan di `docs/compose/reports/sprint-2-final.md`
- Sprint 3: SELESAI — laporan di `docs/compose/reports/sprint-3-final.md`
  - [x] Smart contract: `requestPrint()` + `redeemCard()` + 24/24 tests
  - [x] Deploy kontrak baru: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637` (BNB Testnet)
  - [x] Full loop mint→print→redeem verified on-chain (3 siklus)
  - [x] API routes: `/api/print`, `/api/redeem` dengan rate-limiting + enkripsi code
  - [x] Hash overwrite verified: kode lama invalid setelah siklus baru (tested on-chain)
- Sprint 4: SELESAI
  - [x] Credit system (creditBalance, topUp, deduct) + refund on failure
  - [x] Buy pack deducts credit + mint
  - [x] Request print with simulated Stripe checkout
  - [x] confirmTransaction() extracts tokenId from CardMinted event
  - [x] UI: Home dengan inline reveal (artwork + rarity colors)
  - [x] UI: Top Up credit page
  - [x] UI: Koleksi page dengan card grid + Request Print button
  - [x] UI: Marketplace "Coming Soon"
- Sprint 5: SELESAI
  - [x] QR code generation untuk setiap kartu
  - [x] `/api/scan` endpoint — data on-chain + off-chain + history + verification flag
  - [x] Scan page dengan card detail + verification ✅/⚠️
  - [x] QR display di CardItem (Show QR button)
  - [x] purchasePrice di scan response
  - [x] tokenIds array di mintBatch transaction
  - [x] card-artwork-guideline: QR info-scan terpisah dari redeem code
- Kontrak aktif: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`
- Admin wallet: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`
- 12 API routes aktif di Vercel
- AI Vision: di-skip untuk hackathon (Gemini API quota issues). QR lookup saja sudah cukup.
- Scan endpoint: baca dari MongoDB cache (bukan ethers.js RPC) — fix timeout di Vercel
- Sprint 6: SELESAI
  - [x] Audit core loop — semua endpoint berfungsi, 31/31 contract tests pass
  - [x] Draft pitch deck outline
  - [x] Final deploy + verification
- Brand Identity: SELESAI (8/8 tasks)
  - [x] CSS variables (brand colors, gradients, rarity glow)
  - [x] Navbar (dark navy, cosmic violet, CTA gradient)
  - [x] Home page (hero, gold accent, card reveal)
  - [x] PackCard (dark surface, gold price)
  - [x] CardItem (card-surface, rarity glow, tag badges)
  - [x] TopUp page (dark theme, gold balance)
  - [x] Scan page (card-surface, verification flag)
  - [x] Login, Koleksi, Marketplace, Profil (brand-consistent)

## Notes
- Solo developer, non-programmer, vibe coding via MiMoCode
- ~14 jam/minggu waktu efektif
- Urutan prioritas potong jika waktu mepet: polish UI/UX → fitur AI vision (fallback ke QR lookup polos) → (core mint–vault–redeem TIDAK BOLEH dipotong)
- Marketplace: UI placeholder "Coming Soon" saja, tidak fungsional untuk hackathon (ADR-010)
- Tanggal Demo Day pasti belum diumumkan — cek grup peserta hackathon
- Rencana kerja sama cetak-dan-segel dengan Millennium Print Group (MPG) — hanya untuk tahap produksi, bukan hackathon
- Jalankan `/dream` di akhir setiap sprint untuk merangkum pembelajaran sesi ke file ini

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
