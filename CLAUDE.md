# Instruksi untuk Claude Code

Project ini dibangun dengan **Claude Code** (lihat ADR-029). Sebelumnya memakai MiMoCode
(ADR-015); `.mimo/` dan `.mimocode/` kini hanya artefak historis, bukan konfigurasi aktif.

## Wajib dibaca sebelum membuat perubahan apa pun

1. `MEMORY.md` — status project, sesi terakhir, open items
2. `DECISIONS.md` — seluruh keputusan arsitektur (ADR-001 s/d ADR-029)
3. `docs/00-project-overview.md` — problem, solution, differentiator, scope
4. `PRD-Gachard-Hackathon.md` — PRD lengkap (dokumen historis, lihat blok Amendments di atasnya)

Semua sprint (1–6) sudah selesai; `sprints/SPRINT-*.md` adalah catatan sejarah, bukan
pekerjaan aktif.

## Aturan

- **Jangan menyimpang dari `DECISIONS.md` tanpa mencatat ADR baru.** Kalau kode dan ADR
  bertentangan, salah satunya harus diperbaiki — jangan dibiarkan. Tiga ADR pernah menyimpang
  diam-diam dan baru ketahuan berbulan-bulan kemudian.
- **Jangan pakai istilah blockchain/crypto/NFT/on-chain/gas/wallet di UI user-facing.** Itu
  premis produknya (ADR-002). Istilah teknis hanya boleh di `/admin`.
- **Semua API route pakai `getAuthenticatedUser(request)`** untuk session server-side. Jangan
  pernah percaya `userId` yang dikirim dari frontend.
- **Transaksi blockchain memakai pola async** (ADR-018): POST mengembalikan `pending`,
  frontend polling `/api/transactions`. Jangan menunggu receipt di dalam handler POST — batas
  waktu function Vercel akan memotongnya dan melewatkan refund.
- **Rekonsiliasi tidak boleh menimpa status terminal** (ADR-028): setiap update kartu dari
  hasil rekonsiliasi wajib punya guard `status: { $ne: "Burned" }`.
- **tokenId tidak unik lintas kontrak.** Kontrak sudah di-deploy ulang beberapa kali dan
  penomoran mulai dari 1 lagi. Query kartu pakai `cardId`; kalau terpaksa pakai `tokenId`,
  scope dengan `contractAddress`.
- **Test di lebar mobile** (360–430px) sebelum deploy. Ada blok budget performa mobile di
  `app/globals.css` — hindari menambah `backdrop-filter` atau animasi selalu-jalan di sana.

## Struktur

Backend dan frontend ada di satu service Next.js (`frontend/`, ADR-017) — tidak ada service
terpisah. API routes di `frontend/app/api/`, logic domain di `frontend/lib/`, smart contract
Solidity + Foundry di `contracts/`.

## Deploy

Push ke `main` → Vercel auto-deploy ke https://www.gachard.com. Root Directory di Vercel:
`frontend`.
