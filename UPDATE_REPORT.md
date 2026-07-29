# Laporan Pembaruan Gachard — Sesi Perbaikan UI, Demo Account & Blockchain

> Dokumen ini merangkum **seluruh perubahan** yang dilakukan pada sesi ini agar mudah direview sebelum di-*push* ke GitHub / deploy ke Vercel.
> Stack: **Next.js 16 (App Router) + MongoDB + Smart Contract BNB Testnet**. Semua API adalah *route handler* Next.js (tidak ada FastAPI terpisah, kecuali reverse-proxy untuk preview — lihat bagian 4).

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Perbaikan Visual / Brand (4 halaman)](#2-perbaikan-visual--brand)
3. [Animasi Buka Pack yang Dramatis](#3-animasi-buka-pack-yang-dramatis)
4. [Demo Account + Wiring Blockchain BNB Testnet](#4-demo-account--wiring-blockchain-bnb-testnet)
5. [Perbaikan Infrastruktur Preview (reverse proxy)](#5-perbaikan-infrastruktur-preview)
6. [Penyesuaian UI Lanjutan (permintaan berurutan)](#6-penyesuaian-ui-lanjutan)
7. [Daftar File yang Diubah / Dibuat](#7-daftar-file-yang-diubah--dibuat)
8. [Environment Variables](#8-environment-variables)
9. [Hasil Testing](#9-hasil-testing)
10. [Catatan Deploy (Vercel) & Known Issues](#10-catatan-deploy-vercel--known-issues)

---

## 1. Ringkasan Eksekutif

| Area | Status |
|------|--------|
| Brand alignment halaman **/packs, /play-trade, /profile, /admin** (homepage tidak disentuh) | ✅ Selesai & lolos testing 100% |
| **Animasi buka card pack** yang lebih dramatis | ✅ Selesai |
| **Demo Account** (login tanpa Google, akun real ber-wallet BNB Testnet, username `@DemoN`) | ✅ Selesai & lolos testing 100% |
| **Wallet/blockchain hanya terlihat di Admin console** | ✅ Sesuai permintaan |
| Perbaikan preview `/api/*` (dulu 502) via reverse-proxy | ✅ Selesai |
| Penyesuaian UI lanjutan (hapus label, ikon, dsb.) | ✅ Selesai |

---

## 2. Perbaikan Visual / Brand

Acuan brand = **homepage** (tema kosmik gelap, gradien aurora, font Unbounded/Inter, permukaan *glass*, header `PageShell`).

### 2.1 `/packs`
- **`components/PackCard.tsx` — ditulis ulang**: menghapus emoji (🎴🚀), diganti visual **tumpukan kartu (fanned card-stack)** + emblem bintang SVG, permukaan *glass*, tombol brand (`btn-primary` / `btn-gold`), blok statistik (jumlah kartu / rare+).
- **`app/packs/page.tsx`**: ditambah **legenda "Drop Rates"** (Common 60% / Rare 27% / Epic 10% / Legendary 3%) dengan indikator warna rarity.

### 2.2 `/play-trade`
- Dipoles agar konsisten brand (header, kartu *glass*, ikon bagian PLAY & TRADE).

### 2.3 `/profile`
- Ditambah **bar distribusi rarity ("Rarity Mix")** — Common/Rare/Epic/Legendary lengkap dengan legenda jumlah.

### 2.4 `/admin` — **redesign total**
- Sebelumnya polos; sekarang memakai `PageShell` dengan judul **ADMIN CONSOLE**.
- **Kartu ringkasan** (Users / Transactions / Cards / Pending Prints) yang bisa diklik.
- **Tab berbentuk pill** dengan ikon.
- Tombol **Refresh**.
- Tabel **glass** dengan header rapi, hover, dan *status pill* berwarna.

---

## 3. Animasi Buka Pack yang Dramatis

### `components/home/PackReveal.tsx` — ditulis ulang (4 fase sinematik)
1. **ready** — pack tersegel bercahaya + sinar berputar (light rays), efek "napas" (breathe).
2. **bursting** — pack bergetar (shake) → kilatan putih (flash) → cincin gelombang kejut (shockwave) → 26 partikel percikan (sparks).
3. **revealing** — kartu muncul bergiliran (staggered `card-pop`) dengan sapuan kilau holografis + **aura sesuai rarity** (rare/epic/legendary).
4. **done** — banner **"best pull"** untuk Epic/Legendary + tombol *View in Collection*.

### `app/globals.css` — kit animasi baru
`pack-breathe`, `pack-shake`, `pack-rays`, `burst-flash`, `burst-ring`, `spark`, `card-pop`, `shine-sweep`, `aura-rare/epic/legendary`, `packSheen`, plus *guard* `prefers-reduced-motion`.

> Catatan: Komponen demo `components/PackDemo.tsx` sempat dibuat untuk section "Feel the Pull" di /play-trade, lalu **section-nya dihapus** atas permintaan (lihat bagian 6). Animasi utama tetap dipakai di **/packs**.

---

## 4. Demo Account + Wiring Blockchain BNB Testnet

### 4.1 Konsep
- Halaman `/login` **tetap punya Google OAuth** (tidak dinonaktifkan).
- Aksi "Explore as guest" diubah menjadi tombol **"Demo Account"** (`data-testid=login-demo-btn`), aktif bila env `ENABLE_DEMO_LOGIN=true`.
- Setiap klik membuat **akun REAL** dengan **custodial wallet** (BNB Testnet), username berurutan **`@DemoN`** (N naik tiap akun via koleksi `counters`), dan **10.000 kredit awal**.
- Sesi memakai mekanisme yang sudah ada: `localStorage.user` + cookie `gachard_uid`.

### 4.2 Blockchain (real minting)
- Kontrak aktif ditemukan dari riwayat repo: `CONTRACT_ADDRESS=0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a`.
- Admin wallet (dari private key yang diberikan): `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`.
- **"Buy & Open" di /packs kini melakukan `mintBatch` on-chain sungguhan** (diverifikasi: tx `0xb47a6f...` ter-mined, status=1, tokenId terisi setelah `confirm-all`).

### 4.3 Visibilitas
- **Alamat wallet & data blockchain DISEMBUNYIKAN dari user** (tidak muncul di /profile maupun /packs).
- **Hanya terlihat di Admin console**: tabel Users (walletAddress) & tab Transactions (txHash → testnet.bscscan.com).

### 4.4 File terkait
- `app/api/auth/demo/route.ts` (baru) — endpoint pembuat akun demo (ter-gate `ENABLE_DEMO_LOGIN`).
- `app/login/page.tsx` — state `demoEnabled`, `handleDemoLogin`, tombol "Demo Account".
- `app/layout.tsx` — inject `<meta name="demo-login-enabled">`.

---

## 5. Perbaikan Infrastruktur Preview

**Masalah:** Di lingkungan preview Emergent, ingress meneruskan `/api/*` ke port **8001**, sedangkan app Next.js melayani API di **3000** → semua `/api/*` mengembalikan **502** (login demo, admin, dsb. gagal dari URL preview).

**Solusi:** `backend/server.py` — **FastAPI reverse proxy** pada port 8001 yang meneruskan **semua** request ke `http://localhost:3000`. Setelah ini seluruh `/api/*` berfungsi via URL preview (termasuk `/api/auth/demo` & `/api/admin/*`).

> ⚠️ **Khusus preview Emergent.** Di **Vercel proxy ini TIDAK diperlukan** karena Next.js melayani API route secara native.

---

## 6. Penyesuaian UI Lanjutan

Permintaan berurutan setelah rilis awal:

| # | Permintaan | Perubahan |
|---|-----------|-----------|
| 1 | Hapus section "Feel The Pull" di /play-trade | Section demo pack dihapus (import `PackDemo` dilepas). |
| 2 | Hilangkan label "Section 01/02/03" & ikon lebih menarik | Eyebrow "Section 0X" dihapus; ikon header PLAY/TRADE di-upgrade jadi badge bergradien + glow + ring + sheen animasi + float (`SectionIcon`). |
| 3 | Hapus tulisan kecil "Play & Trade" di atas judul besar | Prop `eyebrow` dihapus dari `PageShell` di /play-trade. |
| 4 | Hapus tulisan kecil "Packs" di halaman Packs | Prop `eyebrow` dihapus dari `PageShell` di /packs. |
| 5 | Sembunyikan "Datacards" di navbar | Item `Datacards` dihapus dari `navItems` (desktop & mobile). Route `/datacards` tetap ada. |

---

## 7. Daftar File yang Diubah / Dibuat

### Dibuat (baru)
- `backend/server.py` — reverse proxy 8001 → 3000
- `backend/requirements.txt` — fastapi/uvicorn/httpx
- `app/api/auth/demo/route.ts` — endpoint Demo Account
- `components/PackDemo.tsx` — komponen demo (tidak lagi dipakai di halaman)
- `UPDATE_REPORT.md` — dokumen ini

### Diubah
- `app/globals.css` — kit animasi buka pack
- `components/home/PackReveal.tsx` — reveal sinematik 4 fase
- `components/PackCard.tsx` — desain ulang tanpa emoji
- `components/Navbar.tsx` — sembunyikan Datacards
- `app/packs/page.tsx` — drop rates, label pack ke reveal, hapus eyebrow "Packs"
- `app/play-trade/page.tsx` — polish brand, hapus Feel the Pull, hapus label Section, `SectionIcon` baru, hapus eyebrow
- `app/profile/page.tsx` — Rarity Mix bar; hardening redirect (`/login?next=/profile` + bersihkan localStorage korup)
- `app/admin/page.tsx` — redesign konsol admin
- `app/login/page.tsx` — tombol Demo Account
- `app/layout.tsx` — meta flag demo
- `frontend/.env` — variabel baru (lihat bagian 8) — *gitignored*

---

## 8. Environment Variables

Ditambahkan di `frontend/.env` (file ini **gitignored** — TIDAK ikut ke GitHub):

```
ENABLE_DEMO_LOGIN=true
ENCRYPTION_SECRET_KEY=<min 32 karakter>
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
CONTRACT_ADDRESS=0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a
ADMIN_WALLET_ADDRESS=0xF7DEd49EB412F69520c38C3f7e36523d71428DEa
ADMIN_PRIVATE_KEY=<RAHASIA — hanya testnet>
```
(sudah ada sebelumnya: `MONGODB_URL`, `DATABASE_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`)

> Untuk **Vercel**: set variabel yang sama di *Project → Settings → Environment Variables*. `ADMIN_PRIVATE_KEY` harus dimasukkan manual (jangan pernah di-commit).

---

## 9. Hasil Testing

Semua diverifikasi oleh testing agent (laporan: `/app/test_reports/iteration_5.json` … `iteration_10.json`):

- **iteration_5** — Brand alignment 4 halaman + animasi: **100% lolos**.
- **iteration_7** — Demo login + fix infra 502: **100% lolos**.
- **iteration_8** — Demo Account real BNB Testnet (mint on-chain nyata, `@DemoN`, wallet admin-only): **100% lolos**.
- **iteration_9 & 10** — Investigasi "Demo Account tidak bisa akses profil": **tidak dapat direproduksi** (flow berfungsi penuh); ditambahkan *hardening* redirect profil.

---

## 10. Catatan Deploy (Vercel) & Known Issues

### Langkah deploy
1. **Save to GitHub** (repo lokal preview belum punya remote; perubahan belum ada di GitHub).
2. Set **Environment Variables** di Vercel (bagian 8).
3. Redeploy → uji tombol **Demo Account** di URL live.

### Known issues / catatan
- **Saldo tBNB admin** ± 0.037 tBNB — top-up via faucet agar mint demo tetap jalan.
- **HTTP Basic Auth Admin**: berfungsi di preview (via proxy) & lokal. Pertimbangkan migrasi ke token/cookie session untuk produksi.
- **Rekomendasi**: beri *rate-limit* pada `/api/auth/demo` agar bot tidak membuat akun demo massal (menghabiskan gas admin) di produksi.
- **`backend/server.py`** hanya untuk preview Emergent; tidak perlu dideploy ke Vercel.

---

*Dokumen dibuat otomatis sebagai ringkasan sesi. Silakan review, lalu gunakan "Save to GitHub" untuk mem-publish perubahan.*

---

## 11. Perbaikan Tampilan Mobile (iPhone 12 Pro 390px & Galaxy S8+ 360px)

Audit responsif di dua ukuran diverifikasi testing agent (`iteration_11` & `iteration_12`).

- **Home hero (utama)** — kartu kipas (fanned cards) dulu tumpang tindih/keluar layar di bawah ~560px. Diperbaiki: cluster kartu di-scale responsif (`scale-[0.58] min-[480px]:scale-75 sm:scale-100`), glow & ring ikut diperkecil, tinggi visual 300px di mobile. Kini tidak tumpang tindih dengan judul & tidak ada scroll horizontal.
- **Bug HIGH: tombol LOGIN nutup hamburger di 360px** — kelas `.btn-primary/.btn-ghost/.btn-gold` didefinisikan di luar `@layer components`, sehingga utility Tailwind `hidden` kalah cascade → pil LOGIN tetap tampil di mobile & mendorong tombol hamburger keluar layar (menu mobile tak bisa dibuka di Galaxy S8+ saat belum login). Diperbaiki: base tombol dibungkus `@layer components` → `hidden sm:inline-flex` berfungsi. Diverifikasi: pil LOGIN tersembunyi, hamburger reachable, `scrollWidth === 360`, dan menu mobile terbuka.
- **Footer subscribe** — input email diberi `min-w-0` agar pil tidak melewati tepi layar (~4px) di 360px.
- **Admin — Print Requests** — blok aksi Fulfillment kini `w-full` (kiri) di mobile, tidak lagi mengambang ke kanan.
- Regresi desktop (≥640px) aman: pil LOGIN muncul lagi, nav desktop utuh.

Hasil akhir: **12/12 kombinasi halaman×viewport lolos**.
