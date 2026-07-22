# Gachard — Status Report
**Tanggal**: 22 Juli 2026
**Sprint aktif**: Sprint 1 — Setup & Scaffold (20–26 Juli 2026)
**Tool**: MiMoCode (model mimo-v2.5-pro)
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan Eksekutif

Gachard adalah platform TCG digital-native untuk Indonesia Web3 Hackathon 2026 (Track Consumer Apps, BNB Chain). User membeli card pack, reveal kartu (NFT tersembunyi di balik UX biasa), bisa cetak fisik (NFT terkunci di vault, bukan di-burn), dan redeem kembali ke digital.

**Arsitektur final: Next.js API routes sebagai SATU-SATUNYA backend** (ADR-017). FastAPI backend sudah dihapus. Seluruh logic berjalan di satu service Vercel.

**Sprint 1 hampir selesai.** Aplikasi scaffold sudah ter-deploy dan berjalan. Satu task tersisa (wallet testnet, dipindah ke Sprint 2). Belum ada smart contract yang ditulis.

---

## 2. Apa yang Sudah Dibangun

### 2.1 Frontend + Backend (Next.js 16.2.11 + React 19.2.4 + Tailwind v4)

**Pages:**
| Halaman | Route | Status |
|---|---|---|
| Home | `/` | Static welcome text |
| Login | `/login` | Google OAuth, simpan user ke localStorage |
| Koleksi | `/koleksi` | Placeholder |
| Profil | `/profil` | Placeholder |

**API Routes (backend — satu-satunya backend):**
| Endpoint | Method | Status |
|---|---|---|
| `/api/auth/google` | POST | Verifikasi Google token + buat wallet custodial REAL (ethers.js) |
| `/api/health` | GET | Cek koneksi MongoDB |
| `/api/transactions` | GET | Polling status transaksi blockchain (async pattern, ADR-018) |

**Lib modules:**
- `lib/mongodb.ts` — koneksi MongoDB Atlas (singleton)
- `lib/wallet.ts` — generate custodial wallet via `ethers.Wallet.createRandom()` (REAL, bukan random hex)
- `lib/auth.ts` — verifikasi Google token + get-or-create user
- `lib/transactions.ts` — CRUD transaksi async (pending → confirmed/failed)
- `lib/rate-limit.ts` — rate-limiting MongoDB untuk redeem (5 attempt/menit, ADR-019)
- `lib/api.ts` — client-side helper untuk login

**PWA:**
- `manifest.json` — nama "Gachard", theme color `#4f46e5`
- `sw.js` — service worker cache-first
- `icons/icon-192.png` + `icons/icon-512.png` — gradient ungu-pink-biru-kuning

**Dependencies:** next, react, react-dom, mongodb, ethers, tailwindcss, typescript

---

## 3. Apa yang Belum Dibangun

| Komponen | Sprint Target | Status |
|---|---|---|
| Smart contract BEP-1155 (mint) | Sprint 2 | Belum mulai |
| Vault/Print/Redeem state machine | Sprint 3 | Belum mulai |
| Sistem credit (top-up + buy pack) | Sprint 4 | Belum mulai |
| UI utama (Buy Pack, Reveal, Request Print) | Sprint 4 | Belum mulai |
| Fitur AI Scan (QR + vision) | Sprint 5 | Belum mulai |
| Marketplace placeholder | Sprint 4 | Belum mulai |
| Kartu fisik sample | Sprint 3 | Belum mulai |
| Pitch deck | Sprint 6 | Belum mulai |
| Real Google OAuth verification | — | Sudah diimplementasi, perlu test dengan Google Client ID asli |

---

## 4. Sprint 1 — Task Status

| Task | Status | Catatan |
|---|---|---|
| Install MiMoCode CLI | Done | |
| ~~Setup akun Xiaomi MiMo Platform~~ | Dihapus | Tidak relevan |
| Git init + repo GitHub + scaffold | Done | |
| Setup hosting | Done | Vercel + MongoDB Atlas |
| ~~Setup wallet testnet + faucet~~ | **Pindah ke Sprint 2** | Prasyarat smart contract |
| Scaffold Google OAuth + wallet custodial | Done | **Real wallet via ethers.js** |
| Struktur UI (Home/Koleksi/Profil) | Done | Placeholder |
| Setup PWA (manifest + service worker + icons) | Done | Icons sudah ada (192x192, 512x512) |
| Push ke GitHub | Done | |
| Deploy ke Vercel | Done | https://frontend-rosy-pi-88.vercel.app |
| API endpoints berfungsi | Done | Login + health + transactions |

---

## 5. Arsitektur & Keputusan Kunci

| ADR | Keputusan | Alasan |
|---|---|---|
| 001 | BEP-1155 | Kartu sama = fungible per rarity |
| 002 | Custodial wallet, tersembunyi | UX mainstream |
| 003 | Gas fee disponsori platform | User tidak pegang crypto |
| 004 | Lock & transfer ke vault, bukan burn | Provenance utuh |
| 005 | Hash overwrite per siklus print | Kode lama otomatis invalid |
| 006 | Redeem lewat backend saja (rate-limited) | Cegah brute-force |
| 007 | `recipientAddress` eksplisit | Backend yang memanggil kontrak |
| 008 | Dual payment: credit vs direct | Pisahkan biaya virtual vs nyata |
| 009 | Odds/rarity di backend | Fleksibilitas tuning |
| 010 | Marketplace "Coming Soon" | Fokus ke core loop |
| 011 | Artwork AI-generate manual | Keandalan demo |
| 013 | PWA | Hindari App Store review |
| 014 | Dokumentasi tool-agnostic | Portabilitas antar tool |
| 015 | MiMoCode sejak awal | Satu tool sepanjang project |
| **017** | **Next.js API routes = satu-satunya backend** | **Hosting terpisah tertutup/wajib CC** |
| **018** | **Pola async untuk blockchain tx** | **Hindari timeout serverless** |
| **019** | **Rate-limiting MongoDB** | **Konsisten di stateless function** |

---

## 6. Rencana Sprint Berikutnya

### Sprint 2 (27 Juli – 2 Agustus) — Core Mint
- Setup wallet testnet + claim faucet
- Smart contract BEP-1155 untuk mint kartu
- Test mint di BNB testnet

### Sprint 3 (3–9 Agustus) — Vault/Print/Redeem
- `requestPrint()` + `redeemCard()`
- Test end-to-end: mint → print → redeem
- Cetak kartu fisik sample

### Sprint 4 (10–16 Agustus) — Credit System + UI
- Top-up credit + buy pack + request print
- Build UI utama end-to-end

### Sprint 5 (17–25 Agustus) — AI Scan
- QR lookup + AI vision
- Test dengan kartu fisik

### Sprint 6 (26–30 Agustus) — Stabilisasi & Pitch
- Bug fixing, pitch deck, video backup

---

## 7. Risiko & Catatan

1. **Smart contract belum dimulai** — prioritas #1, Sprint 2 harus fokus 100%.
2. **Solo developer, non-programmer, ~14 jam/minggu** — waktu sangat terbatas.
3. **Tanggal Demo Day belum diumumkan** — cek grup peserta hackathon.
4. **Workshop Sesi 4 (Smart Contract 2: Security)** — 26 Juli 2026.
5. **Wallet testnet belum disiapkan** — prasyarat untuk deploy smart contract.

---

## 8. Struktur File Project

```
D:\Gachard\
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── .mimo/
│   └── config.md
├── .mimocode/
│   └── mimocode.json
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Home
│   │   ├── login/page.tsx              # Google OAuth login
│   │   ├── koleksi/page.tsx            # Koleksi (placeholder)
│   │   ├── profil/page.tsx             # Profil (placeholder)
│   │   └── api/
│   │       ├── auth/google/route.ts    # Login + wallet creation
│   │       ├── health/route.ts         # Health check
│   │       └── transactions/route.ts   # Tx status polling
│   ├── components/
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── mongodb.ts                  # MongoDB connection
│   │   ├── wallet.ts                   # Custodial wallet (ethers.js)
│   │   ├── auth.ts                     # Google token verification
│   │   ├── transactions.ts             # Async tx CRUD
│   │   ├── rate-limit.ts               # MongoDB rate-limiting
│   │   └── api.ts                      # Client-side helpers
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── icons/
│   │       ├── icon-192.png
│   │       └── icon-512.png
│   └── package.json
├── docs/
│   ├── 00-project-overview.md
│   ├── STATUS-REPORT.md
│   └── compose/
├── sprints/
│   ├── SPRINT-1.md ... SPRINT-6.md
├── CLAUDE.md
├── DECISIONS.md                # 19 ADRs
├── Execution-Plan-Gachard.md
├── MEMORY.md
├── PRD-Gachard-Hackathon.md
└── README.md
```

---

*Laporan ini dibuat untuk review lintas tool. File ini bisa dibaca oleh Claude Code, MiMoCode, atau tool AI lainnya.*
