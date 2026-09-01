# LAPORAN AKHIR — Pembaruan Gachard

**Proyek:** Gachard — Collectible Card Ecosystem
**Stack:** Next.js 16 (App Router) · MongoDB · Smart Contract BNB Testnet
**Tanggal laporan:** 29 Juli 2026
**Status:** ✅ Semua item selesai & lolos pengujian otomatis (iteration_5 – iteration_12)

> Dokumen ini adalah **laporan akhir** yang merangkum seluruh pekerjaan pada sesi ini, siap direview sebelum *Save to GitHub* & deploy ke Vercel.

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Perbaikan Visual / Brand (4 Halaman)](#2-perbaikan-visual--brand-4-halaman)
3. [Animasi Buka Card Pack](#3-animasi-buka-card-pack)
4. [Demo Account + Blockchain BNB Testnet](#4-demo-account--blockchain-bnb-testnet)
5. [Perbaikan Infrastruktur Preview](#5-perbaikan-infrastruktur-preview)
6. [Penyesuaian UI Lanjutan](#6-penyesuaian-ui-lanjutan)
7. [Perbaikan Tampilan Mobile](#7-perbaikan-tampilan-mobile)
8. [Daftar File yang Diubah / Dibuat](#8-daftar-file-yang-diubah--dibuat)
9. [Environment Variables](#9-environment-variables)
10. [Ringkasan Hasil Pengujian](#10-ringkasan-hasil-pengujian)
11. [Panduan Deploy ke Vercel](#11-panduan-deploy-ke-vercel)
12. [Known Issues & Rekomendasi](#12-known-issues--rekomendasi)

---

## 1. Ringkasan Eksekutif

| # | Pekerjaan | Status |
|---|-----------|--------|
| 1 | Brand alignment halaman **/packs, /play-trade, /profile, /admin** (homepage tidak diubah) | ✅ Lolos 100% |
| 2 | **Animasi buka card pack** sinematik & dramatis | ✅ Selesai |
| 3 | **Demo Account** — login tanpa Google, akun real ber-wallet BNB Testnet, username `@DemoN` | ✅ Lolos 100% |
| 4 | Wallet & data blockchain **hanya terlihat di Admin console** | ✅ Sesuai permintaan |
| 5 | Fix `/api/*` 502 di preview (reverse proxy) | ✅ Selesai |
| 6 | Penyesuaian UI (hapus label, ikon, footer, navbar) | ✅ Selesai |
| 7 | **Perbaikan tampilan mobile** (iPhone 12 Pro & Galaxy S8+) | ✅ Lolos 12/12 |

---

## 2. Perbaikan Visual / Brand (4 Halaman)

Acuan brand = **homepage** (tema kosmik gelap, gradien aurora, font Unbounded/Inter, permukaan *glass*, header `PageShell`). **Homepage tidak disentuh.**

### `/packs`
- `components/PackCard.tsx` **ditulis ulang**: hapus emoji, ganti visual **tumpukan kartu (fanned)** + emblem bintang, permukaan glass, tombol brand, blok statistik.
- `app/packs/page.tsx`: tambah legenda **Drop Rates** (Common 60% / Rare 27% / Epic 10% / Legendary 3%).

### `/play-trade`
- Dipoles konsisten brand (header, kartu glass, ikon section).

### `/profile`
- Tambah **bar distribusi rarity ("Rarity Mix")** lengkap dengan legenda.

### `/admin` — redesign total
- `PageShell` dengan judul **ADMIN CONSOLE**, kartu ringkasan (Users/Transactions/Cards/Pending Prints), tab pill berikon, tombol Refresh, tabel glass dengan status pill berwarna.

---

## 3. Animasi Buka Card Pack

**`components/home/PackReveal.tsx`** — reveal sinematik 4 fase:
1. **ready** — pack tersegel bercahaya + sinar berputar + efek napas.
2. **bursting** — getar → kilatan putih → cincin gelombang kejut → 26 partikel percikan.
3. **revealing** — kartu muncul bergiliran (staggered) + sapuan kilau holo + **aura sesuai rarity**.
4. **done** — banner **"best pull"** (Epic/Legendary) + tombol *View in Collection*.

**`app/globals.css`** — kit animasi baru: `pack-breathe`, `pack-shake`, `pack-rays`, `burst-flash`, `burst-ring`, `spark`, `card-pop`, `shine-sweep`, `aura-rare/epic/legendary`, `packSheen`, plus guard `prefers-reduced-motion`. Dipakai di halaman **/packs**.

---

## 4. Demo Account + Blockchain BNB Testnet

- Google OAuth **tetap ada**. Aksi "Explore as guest" diubah jadi tombol **"Demo Account"** (`login-demo-btn`), aktif bila `ENABLE_DEMO_LOGIN=true`.
- `POST /api/auth/demo` membuat **akun REAL** (custodial wallet BNB Testnet), username berurutan **`@DemoN`** (koleksi `counters`), **10.000 kredit awal**, sesi via `localStorage.user` + cookie `gachard_uid`.
- **Minting on-chain nyata**: "Buy & Open" memanggil `mintBatch` pada kontrak aktif. Diverifikasi: tx `0xb47a6f…` ter-mined (status=1), tokenId terisi setelah `confirm-all`.
- **Wallet & data blockchain disembunyikan dari user** (tidak muncul di /profile & /packs); **hanya di Admin console** (Users → walletAddress, Transactions → txHash ke testnet.bscscan.com).

---

## 5. Perbaikan Infrastruktur Preview

**Masalah:** Ingress preview meneruskan `/api/*` ke port 8001, sedangkan Next.js melayani API di 3000 → semua `/api/*` 502.
**Solusi:** `backend/server.py` = **FastAPI reverse proxy** (8001 → `http://localhost:3000`). Semua `/api/*` (termasuk `/api/auth/demo`, `/api/admin/*`) kini jalan via URL preview.
> ⚠️ Hanya untuk preview Emergent. Di **Vercel tidak diperlukan** (Next.js melayani API native).

---

## 6. Penyesuaian UI Lanjutan

| # | Permintaan | Perubahan |
|---|-----------|-----------|
| 1 | Hapus section "Feel The Pull" di /play-trade | Section demo pack dihapus. |
| 2 | Hapus label "Section 01/02/03" & ikon lebih menarik | Eyebrow section dihapus; ikon PLAY/TRADE jadi badge gradien + glow + ring + sheen + float (`SectionIcon`). |
| 3 | Hapus tulisan kecil "Play & Trade" di atas judul | Prop `eyebrow` dilepas di /play-trade. |
| 4 | Hapus tulisan kecil "Packs" | Prop `eyebrow` dilepas di /packs. |
| 5 | Sembunyikan "Datacards" di navbar | Item dihapus dari `navItems` (desktop & mobile); route `/datacards` tetap ada. |
| 6 | Footer section Product | Diubah menjadi: **Collect, Play, Trade, Scan, Redeem**. |

---

## 7. Perbaikan Tampilan Mobile

Diuji di **iPhone 12 Pro (390×844)** & **Galaxy S8+ (360×740)** — hasil **12/12 lolos**.

- **Home hero** — kartu kipas dulu tumpang tindih/keluar layar di <560px. Diperbaiki dengan scale responsif (`scale-[0.58] min-[480px]:scale-75 sm:scale-100`), glow/ring diperkecil, tinggi visual 300px di mobile.
- **Bug HIGH (navbar 360px)** — kelas `.btn-primary/.btn-ghost/.btn-gold` berada di luar `@layer components` sehingga `hidden` kalah cascade → pil **LOGIN** tetap tampil di mobile & mendorong tombol hamburger keluar layar (menu mobile tak bisa dibuka). Diperbaiki: base tombol dibungkus `@layer components`. Diverifikasi: pil LOGIN tersembunyi, hamburger reachable, `scrollWidth === 360`, menu mobile terbuka.
- **Footer subscribe** — input email diberi `min-w-0` agar pil tidak melewati tepi layar.
- **Admin › Print Requests** — blok aksi Fulfillment kini full-width (kiri) di mobile.
- Regresi desktop (≥640px) aman.

---

## 8. Daftar File yang Diubah / Dibuat

### Dibuat
- `backend/server.py`, `backend/requirements.txt` — reverse proxy preview
- `app/api/auth/demo/route.ts` — endpoint Demo Account
- `components/PackDemo.tsx` — komponen demo (tidak lagi dipakai di halaman)
- `LAPORAN_AKHIR.md` (dokumen ini) · `UPDATE_REPORT.md` (versi awal)

### Diubah
- `app/globals.css` — kit animasi + fix `@layer components` tombol
- `components/home/PackReveal.tsx` — reveal 4 fase
- `components/PackCard.tsx` — desain ulang tanpa emoji
- `components/home/HomeHero.tsx` — scaling hero mobile
- `components/Navbar.tsx` — sembunyikan Datacards
- `components/Footer.tsx` — section Product + `min-w-0`
- `app/packs/page.tsx` — drop rates, label reveal, hapus eyebrow
- `app/play-trade/page.tsx` — polish, hapus Feel the Pull & label Section, `SectionIcon`, hapus eyebrow
- `app/profile/page.tsx` — Rarity Mix bar + hardening redirect
- `app/admin/page.tsx` — redesign konsol + fix mobile print row
- `app/login/page.tsx` — tombol Demo Account
- `app/layout.tsx` — meta flag demo
- `frontend/.env` — variabel baru (*gitignored*)

---

## 9. Environment Variables

Di `frontend/.env` (file **gitignored** — tidak ikut ke GitHub):

```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=gachard
ADMIN_USERNAME=[REDACTED]
ADMIN_PASSWORD=[REDACTED]
GOOGLE_CLIENT_ID=
ENABLE_DEMO_LOGIN=true
ENCRYPTION_SECRET_KEY=<min 32 karakter>
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
CONTRACT_ADDRESS=0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a
ADMIN_WALLET_ADDRESS=0xF7DEd49EB412F69520c38C3f7e36523d71428DEa
ADMIN_PRIVATE_KEY=<RAHASIA — testnet only, JANGAN commit>
```

---

## 10. Ringkasan Hasil Pengujian

| Iterasi | Fokus | Hasil |
|---------|-------|-------|
| iteration_5 | Brand alignment 4 halaman + animasi | 100% ✅ |
| iteration_7 | Demo login + fix 502 | 100% ✅ |
| iteration_8 | Demo Account real BNB Testnet (mint on-chain, @DemoN, wallet admin-only) | 100% ✅ |
| iteration_9–10 | Investigasi "Demo Account tak bisa akses profil" | Tidak reproducible; + hardening redirect ✅ |
| iteration_11 | Audit mobile | Hero fix ✓, temukan bug navbar 360px |
| iteration_12 | Retest mobile setelah fix | 12/12 ✅ |

---

## 11. Panduan Deploy ke Vercel

1. **Save to GitHub** (repo preview belum punya remote → perubahan belum ada di GitHub).
2. Set **Environment Variables** di Vercel (bagian 9). `ADMIN_PRIVATE_KEY` dimasukkan manual (jangan commit).
3. **Redeploy** → uji tombol **Demo Account** di URL live.
4. `backend/server.py` **tidak** perlu dideploy ke Vercel.

---

## 12. Known Issues & Rekomendasi

- **Saldo tBNB admin** ± 0.037 tBNB — top-up via faucet agar mint demo tetap jalan.
- **Rate-limit** disarankan pada `/api/auth/demo` agar tidak disalahgunakan (membuat akun demo massal / menghabiskan gas) di produksi.
- **Admin HTTP Basic Auth** berfungsi; pertimbangkan migrasi ke token/cookie session untuk produksi yang lebih robust.
- `components/PackDemo.tsx` kini tidak terpakai di halaman mana pun — bisa dihapus bila diinginkan.

---

*Laporan akhir — siap direview. Gunakan "Save to GitHub" untuk mem-publish perubahan.*
