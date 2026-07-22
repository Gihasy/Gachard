# MEMORY

## Instruksi untuk AI Coding Agent (dibaca otomatis setiap sesi oleh MiMoCode)

Selain file ini, baca juga secara eksplisit di awal sesi:
1. `DECISIONS.md` — seluruh keputusan arsitektur (ADR) yang sudah dikunci
2. `docs/00-project-overview.md` — problem, solution, differentiator, scope
3. `sprints/SPRINT-[N].md` — sprint aktif, ikuti scope-nya secara ketat, gunakan isinya sebagai `/goal` di awal sesi

Jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru. Jangan membangun fitur di luar scope sprint aktif meski tampak berguna.

## Current Sprint
Sprint 2 (Minggu 2: 27 Juli – 2 Agustus 2026)

## Current Goal
Core mint function jalan di testnet. Prioritas #1 — TIDAK BOLEH gagal.

## Project Status
- PRD selesai — lihat `docs/00-project-overview.md` (ringkas) dan `PRD-Gachard-Hackathon.md` (lengkap)
- Execution Plan 6 minggu sudah disusun, disinkronkan dengan jadwal workshop hackathon
- Tool utama: MiMoCode (model mimo-v2.5-pro, berbayar) sejak awal — TIDAK memakai Emergent (lihat ADR-015)
- Hosting: Vercel (frontend + backend via API routes) + MongoDB Atlas (database), semua free tier
- **Arsitektur final**: Next.js API routes sebagai SATU-SATUNYA backend (lihat ADR-017). FastAPI sudah dihapus.
- **Enkripsi**: Private key dienkripsi AES-256-GCM sebelum simpan di MongoDB (ADR-020)
- Sprint 1: SELESAI — laporan di `docs/compose/reports/sprint-1-final.md`
- Sprint 2 progress:
  - [x] Setup wallet testnet + claim faucet
  - [x] Smart contract BEP-1155 (`GachardCard.sol`) dengan `mintCard(address,uint8 rarity)`
  - [x] Deploy ke BNB Testnet: `0xc7d37b43fa706c646f89b19b78b9c2329925731c` (wallet baru)
  - [x] Test mint di testnet (3 kartu: Common, Rare, Epic — terverifikasi)
  - [x] Integrasi frontend (API route `/api/mint` + odds table + card templates + async tx)
  - [x] Rotasi wallet admin (private key lama sudah tidak aman, wallet baru aktif)

## Notes
- Solo developer, non-programmer, vibe coding via MiMoCode
- ~14 jam/minggu waktu efektif
- Urutan prioritas potong jika waktu mepet: polish UI/UX → fitur AI vision (fallback ke QR lookup polos) → (core mint–vault–redeem TIDAK BOLEH dipotong)
- Marketplace: UI placeholder "Coming Soon" saja, tidak fungsional untuk hackathon
- Tanggal Demo Day pasti belum diumumkan — cek grup peserta hackathon
- Rencana kerja sama cetak-dan-segel dengan Millennium Print Group (MPG) — hanya untuk tahap produksi, bukan hackathon
- Jalankan `/dream` di akhir setiap sprint untuk merangkum pembelajaran sesi ke file ini
