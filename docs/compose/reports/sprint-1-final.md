# Laporan Sprint 1 — Setup & Scaffold
**Periode**: 20–26 Juli 2026
**Status**: Selesai (1 task dipindah ke Sprint 2)
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Sprint 1 bertujuan membangun fondasi aplikasi Gachard: scaffold Next.js, login Google OAuth, wallet custodial, struktur UI, dan deploy ke Vercel. Selama sprint berjalan, terjadi perubahan arsitektur signifikan — backend FastAPI terpisah dihapus dan seluruh logic dipindahkan ke Next.js API routes (ADR-017).

**Hasil akhir**: aplikasi scaffold lengkap, ter-deploy, dan berjalan di satu service Vercel.

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 1 | Install MiMoCode CLI | Done | |
| 2 | Git init + repo GitHub + scaffold | Done | README, MEMORY, DECISIONS, docs, sprints |
| 3 | Setup hosting | Done | Vercel + MongoDB Atlas (free tier) |
| 4 | ~~Setup akun Xiaomi MiMo Platform~~ | Dihapus | Tidak relevan — MiMoCode sudah berjalan |
| 5 | ~~Setup wallet testnet + faucet~~ | **Pindah ke Sprint 2** | Di luar scope scaffold, prasyarat smart contract |
| 6 | Scaffold Google OAuth + wallet custodial | Done | Real wallet via ethers.js |
| 7 | Struktur UI (Home/Koleksi/Profil) | Done | Placeholder |
| 8 | Setup PWA (manifest + service worker + icons) | Done | Icons 192x192 + 512x512 generated |
| 9 | Push ke GitHub | Done | |
| 10 | Deploy ke Vercel | Done | |
| 11 | API endpoints berfungsi | Done | Login + health + transactions |
| 12 | Migrasi arsitektur: hapus FastAPI | Done | ADR-017 |
| 13 | Pola async untuk blockchain tx | Done | ADR-018 |
| 14 | Rate-limiting MongoDB untuk redeem | Done | ADR-019 |

---

## 3. Definition of Done — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Login via Google berhasil, wallet custodial otomatis dibuat | Pass | `POST /api/auth/google` — verifikasi Google token, generate wallet ethers.js, simpan ke MongoDB |
| UI shell dasar bisa diakses tanpa error | Pass | Build sukses (`next build`), 4 pages + 3 API routes tanpa error TypeScript |
| Repo GitHub berisi scaffold + kode awal, ter-push | Pass | Remote `Gihasy/Gachard` |
| Deployment berhasil diakses | Pass | https://frontend-rosy-pi-88.vercel.app |

---

## 4. Perubahan Arsitektur (Tengah Sprint)

### Sebelum
```
Frontend (Next.js, Vercel)  →  Backend (FastAPI, Render/Railway)  →  MongoDB Atlas
```

### Sesudah
```
Frontend + Backend (Next.js API Routes, Vercel)  →  MongoDB Atlas
```

### Alasan
Tiga opsi hosting backend terpisah (Koyeb, Railway, Fly.io) tertutup atau wajib kartu kredit. Render bermasalah untuk kartu yang tersedia. Next.js API routes sudah ter-deploy di Vercel tanpa biaya tambahan.

### Dampak
- Kompleksitas infrastruktur berkurang dari 2 service menjadi 1
- Tidak perlu manage CORS, env var di 2 tempat, atau deploy pipeline terpisah
- Semua logic (auth, wallet, transactions, rate-limit) di satu codebase

---

## 5. File yang Dibuat/Dimodifikasi

### File Baru
| File | Fungsi |
|---|---|
| `frontend/lib/wallet.ts` | Generate custodial wallet via `ethers.Wallet.createRandom()` |
| `frontend/lib/auth.ts` | Verifikasi Google token + get-or-create user di MongoDB |
| `frontend/lib/transactions.ts` | CRUD transaksi async (pending → confirmed/failed) |
| `frontend/lib/rate-limit.ts` | Rate-limiting MongoDB (5 attempt/menit per user) |
| `frontend/app/api/transactions/route.ts` | Endpoint polling status transaksi |
| `frontend/public/icons/icon-192.png` | PWA icon 192x192 (gradient ungu-pink-biru-kuning) |
| `frontend/public/icons/icon-512.png` | PWA icon 512x512 |
| `docs/STATUS-REPORT.md` | Status report project |
| `docs/compose/reports/sprint-1-scaffold.md` | Laporan compose sprint 1 |

### File Dimodifikasi
| File | Perubahan |
|---|---|
| `frontend/app/api/auth/google/route.ts` | Diganti pakai `lib/auth.ts` + `lib/wallet.ts` (bukan mock) |
| `frontend/package.json` | + `ethers` dependency |
| `DECISIONS.md` | + ADR-017, ADR-018, ADR-019 |
| `MEMORY.md` | Updated status project + arsitektur baru |
| `README.md` | Updated stack + deployment instructions |
| `sprints/SPRINT-1.md` | Updated tasks + architecture notes |

### File Dihapus
| File | Alasan |
|---|---|
| `backend/` (seluruh folder) | Migrasi ke Next.js API routes (ADR-017) |

---

## 6. ADR yang Ditambahkan

### ADR-017: Next.js API Routes Sebagai Satu-Satunya Backend
- **Decision**: Seluruh backend logic lewat Next.js API routes (`app/api/`)
- **Reason**: Hosting terpisah tertutup/wajib CC; Vercel sudah handle tanpa biaya tambahan
- **Supersedes**: Referensi FastAPI/Render/Railway di ADR-012, ADR-015

### ADR-018: Pola Async untuk Transaksi Blockchain
- **Decision**: Endpoint return langsung `{status: "pending"}`, status disimpan di MongoDB, frontend polling
- **Reason**: Hindari timeout serverless (Vercel default 10s) saat menunggu konfirmasi blockchain

### ADR-019: Rate-Limiting Berbasis MongoDB
- **Decision**: Rate-limit pakai MongoDB collection `rate_limits`, bukan in-memory
- **Reason**: Serverless bersifat stateless — in-memory tidak konsisten antar invocation

---

## 7. Dependencies

### Runtime
| Package | Versi | Fungsi |
|---|---|---|
| next | 16.2.11 | Framework |
| react | 19.2.4 | UI library |
| react-dom | 19.2.4 | React DOM |
| mongodb | ^7.5.0 | MongoDB driver |
| ethers | ^6.x | Ethereum wallet + provider |

### Dev
| Package | Versi | Fungsi |
|---|---|---|
| tailwindcss | ^4 | CSS framework |
| typescript | ^5 | Type checking |
| eslint | ^9 | Linting |
| sharp | ^0.33.x | Image generation (icons) |

---

## 8. API Endpoints

| Endpoint | Method | Fungsi | Status |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet custodial | Aktif |
| `/api/health` | GET | Cek koneksi MongoDB | Aktif |
| `/api/transactions` | GET | Polling status transaksi (param: `txId`) | Aktif (framework, belum ada tx real) |

---

## 9. MongoDB Collections

| Collection | Fungsi | Status |
|---|---|---|
| `users` | Data user + wallet address + private key | Aktif |
| `transactions` | Status transaksi blockchain (pending/confirmed/failed) | Schema siap, belum ada data |
| `rate_limits` | Rate-limiting per user per menit | Schema siap, belum ada data |

---

## 10. Risiko & Catatan untuk Sprint 2

1. **Wallet testnet belum disiapkan** — ini task pertama Sprint 2. Butuh wallet BNB testnet + faucet sebelum bisa deploy smart contract.
2. **Smart contract belum ada** — Sprint 2 harus fokus 100% ke ini. Ini prioritas #1 (PRD §10: "core mint–vault–redeem TIDAK BOLEH dipotong").
3. **ethers.js vs viem** — saat ini pakai ethers.js karena lebih umum. Bisa dievaluasi ulang jika viem lebih cocok untuk interaksi kontrak nanti.
4. **Private key disimpan plaintext di MongoDB** — untuk demo hackathon ini acceptable. Produksi butuh encryption.
5. **Workshop Sesi 4 (Smart Contract 2: Security)** — 26 Juli 2026. Bawa scaffold untuk ditanyakan ke mentor.
6. **Solo developer, ~14 jam/minggu** — Sprint 2 harus sangat fokus, jangan tergoda tambah fitur.

---

## 11. Rekomendasi untuk Sprint 2

1. **Mulai dengan setup wallet testnet + faucet** — ini prasyarat untuk semua task Sprint 2.
2. **Gunakan Foundry** untuk smart contract development (lebih cepat dari Hardhat untuk Solidity testing).
3. **Deploy ke BNB Testnet** dulu, bukan opBNB — lebih banyak dokumentasi dan tooling.
4. **Test mint di block explorer** sebelum integrasi ke frontend — pastikan kontrak berfungsi di chain dulu.
5. **Jangan skip penjelasan kode** — minta MiMoCode jelaskan setiap bagian smart contract supaya dipahami, bukan cuma diterima mentah.

---

*Laporan ini disusun untuk review. Bisa dibaca oleh Claude Code, MiMoCode, atau tool AI lainnya.*
