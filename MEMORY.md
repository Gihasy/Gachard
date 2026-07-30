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
Persiapan Demo Day — data sudah bersih (clean-slate 28 Juli 2026).

## Project Status
- PRD selesai — lihat `docs/00-project-overview.md` (ringkas) dan `PRD-Gachard-Hackathon.md` (lengkap)
- Tool utama: MiMoCode (model mimo-v2.5-pro, berbayar) sejak awal — TIDAK memakai Emergent (lihat ADR-015)
- Hosting: Vercel (frontend + backend via API routes) + MongoDB Atlas (database), semua free tier
- **Arsitektur final**: Next.js API routes sebagai SATU-SATUNYA backend (lihat ADR-017). FastAPI sudah dihapus.
- **Enkripsi**: Private key + redeem code dienkripsi AES-256-GCM (ADR-020)
- Kontrak aktif: `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a` (28 Juli 2026 — tanpa vault transfer)
- Admin wallet: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`
- **29 file** berubah di sesi terakhir (10 baru, 18 ubah, 1 hapus), commit `3fc40c7`
- Deploy: https://www.gachard.com (Vercel Production)

### Sprint 1-6: SEMUA SELESAI
- Sprint 1: scaffold, login, UI, PWA icons — laporan di `docs/compose/reports/sprint-1-final.md`
- Sprint 2: core mint, smart contract, test mint on-chain — laporan di `docs/compose/reports/sprint-2-final.md`
- Sprint 3: requestPrint + redeemCard, full loop verified — laporan di `docs/compose/reports/sprint-3-final.md`
- Sprint 4: credit system, buy pack, print checkout, UI pages
- Sprint 5: QR codes, /api/scan, scan page, purchasePrice
- Sprint 6: stabilization + pitch deck outline + brand identity (8/8 tasks)
- Brand Identity: SELESAI — CSS variables, Navbar, Home, PackCard, CardItem, TopUp, Scan, Login, Collection, Marketplace, Profile

### Clean-Slate untuk Demo Day: SELESAI (28 Juli 2026)
- Database dibersihkan 2x (kontrak lama + kontrak baru)
- 16 kartu di-mint di kontrak baru `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a` (tokenId 1-16)
- Semua kartu terverifikasi on-chain: status=Digital, balance=1, contractAddress recorded
- tokenId 1: Locked (via script), tokenId 2: Shipping (via admin), tokenId 3-16: Digital (clean)
- Print flow tested: tokenId 47 berhasil di-vault (status=1, contractBalance=1)
- Transfer block tested: safeTransferFrom pada token Vaulted REVERT
- Demo user credit: 4000 (sisa dari 5000 setelah 2 pack)

### Emergent Design Overhaul: SELESAI + AUDITED
- 8 commits from Emergent pulled, merged, deployed (+3470/-482 lines)
- 6-step audit completed: ADR-010 compliant, no credential leak, proxy.ts safe, .emergent/cron inert
- TypeScript fixes applied (scan/page.tsx)
- External logos replaced with local assets (`frontend/public/icons/`)
- `.emergent/cron/` deleted from repo
- Route renames: `/koleksi` → `/collection`, `/profil` → `/profile`

### Google OAuth: FIXED, DEPLOYED
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` set di `.env.local` dan Vercel Production
- Login page menggunakan Google Identity Services SDK (real OAuth, bukan mock)
- **Backend menggunakan `google-auth-library` (verifyIdToken) untuk verifikasi signature JWT** (bukan decode manual)
- `wallet_address` dihapus dari response POST /api/auth/google
- Authorized JavaScript origin ditambahkan di Google Cloud Console
- **Status**: Deployed, terverifikasi

### Service Worker: FIXED, DEPLOYED
- sw.js di-fix: cache versioning (`gachard-v2026-07-23-02`), `skipWaiting()`, `activate` event dengan old cache cleanup
- HTML pages: network-first strategy (selalu fetch fresh)
- Static assets: cache-first strategy
- ServiceWorkerRegister.tsx: cache-bust SW registration dengan timestamp
- **Status**: Deployed, verified

### Blockchain Abstraction: SELESAI (27 Juli 2026)
- txHash dihapus dari SEMUA user-facing API response (mint, print, redeem, transactions, scan, cards)
- Invoice ID format `GC-YYYYMMDD-XXXX` menggantikan ObjectId mentah
- Friendly status: pending→Processing, confirmed→Success, Digital→Digital, Vaulted→Print Requested
- **Auto-confirm DIHAPUS dari POST handlers** (28 Juli 2026) — endpoint langsung return "pending", frontend polling `/api/transactions` yang panggil `confirmTransaction()`. Ini mencegah refund ter-skip akibat Vercel function timeout.
- Laporan: `docs/compose/reports/blockchain-abstraction-admin-print-real.md`

### Admin Console: SELESAI (27 Juli 2026)
- `/admin` page dengan 4 tab: Users, Transactions, Cards, Print Requests
- HTTP Basic Auth via `proxy.ts` (Next.js 16, bukan middleware.ts)
- Admin API routes: /api/admin/users, transactions, cards, print-requests, accept-print, confirm-all
- Credential: `ADMIN_USERNAME=gachard-admin-aaafac`, `ADMIN_PASSWORD=qPBfAqpqYgYheb5T6_w-h1sB`
- Ter-set di `.env.local` DAN Vercel Production

### Print-to-Real Flow: SELESAI (27 Juli 2026)
- User klik Print → kartu terkunci (Vaulted) → admin Accept → status "Real"
- **On-chain verified (28 Juli 2026)**: `requestPrint()` memanggil `_update(ownerAddress, address(this))` → NFT PINDAH ke vault (contract address). `cardStatus=Vaulted`, `contractBalance=1`, `ownerBalance=0`.
- **Transfer block verified**: `safeTransferFrom` pada token Vaulted REVERT: "Card is vaulted, transfer blocked" (tested on tokenId 46).
- **Transfer Digital verified**: `safeTransferFrom` pada token Digital SUCCESS (tested on tokenId 45).
- **3 kontrak pernah di-deploy**: Sprint 2 (`0xc7D37b...`), Sprint 3 (`0x122ace...`), Current (`0xe62bC7...`). TokenId tersebar di kontrak berbeda.
- **Sebagian besar token lama**: `cardStatus=0` (Digital) di on-chain, tapi MongoDB menunjukkan "Vaulted"/"Print Requested". Ketidaksesuaian karena requestPrint lama mungkin tidak berhasil di-eksekusi on-chain.
- **`contractAddress` field ditambahkan** ke records `cards` dan `transactions` mulai 28 Juli 2026.
- Kartu "Real" tetap muncul di collection user (UI), user tetap bisa scan dan lihat stats
- Redeem: user masukkan Card ID + Redeem Code di halaman Profile → NFT pindah ke penebus
- QR disembunyikan untuk kartu "Print Requested" dan "Real"

### UI Overhaul: SELESAI (27 Juli 2026)
- Rarity badge (Common/Rare/Epic/Legendary) DIHAPUS dari semua kartu
- Stats (ATK/DEF/HP) DIHAPUS dari featured cards
- Nama kartu: templateId → "Card #X"
- Status "Ready" → "Digital"
- Token ID → Card ID
- Balance DIHAPUS dari homepage (tetap di Profile + Top Up)
- Season 1 references DIHAPUS dari Profile
- Kartu image ratio: 3:4 → **5:7** (sesuai 1500x2100px), object-cover → object-contain
- Show QR button DIHAPUS dari collection cards

### Scan Page Enhancement: SELESAI (27 Juli 2026)
- Last Owner: wallet address → `@username` (resolved dari MongoDB)
- Transaction History: from/to tampilkan `@username` (bukan address)
- Admin wallet address → label "Gachard"
- Vault address → label "Gachard Vault"

### Open Items (belum selesai)
1. **DNS gachard.com** — domain dibeli, ditambahkan ke Vercel, tapi DNS belum dikonfigurasi di registrar (Rumahweb). Perlu: NS1 → ns1.vercel-dns.com + NS2 → ns2.vercel-dns.com
2. **Demo Day prep** — video backup, pitch deck, rehearsal, test full loop dengan alamat sungguhan
3. **AI Vision (Gemini)** — DITUNDA, WAJIB dikerjakan sebelum submission final (syarat tema hackathon "AI x Web3")

### Session 30 Juli 2026 (Part 2 — Malam) — Ringkasan Perubahan
- 45+ commit, 50 file berubah (+1,397 / -364 lines)
- **Claim Shipping System**: QR code, camera scan, claimId, block redeem until Real
- **Auto-confirm**: Mint, Print, Redeem — tunggu receipt 8 detik sebelum return
- **QR Scanner**: Portal full-screen, corner markers, scan line, detection feedback
- **Optimistic UI**: Status update tanpa refresh halaman
- **Admin Console**: Stats langsung load, cardId display, username+address, NEW badge, QR side-by-side
- **Transaction History**: cardId bukan tokenId, resolve mint cardIds
- **Image Optimization**: PNG → WebP (-69%), AVIF support, next.config update
- **Security**: maxDuration 15 detik, unique index cardId, collision retry
- **Pack Reveal**: Manual open (hapus auto-open)
- **Blockchain Audit**: Semua user-facing pages bersih dari istilah teknis
- **Vercel Config**: vercel.json di root, Root Directory harus `.`
- **Deploy Issue**: Kena limit 100/hari, tunggu besok + fix Root Directory
- Laporan: `docs/compose/reports/2026-07-30-evening-session-report.md`

### Session 28 Juli 2026 — Ringkasan Perubahan
- 13 commit, 11x deploy, 40+ file berubah
- Security fixes (auto-confirm, Cache-Control, contractAddress)
- Pack system redesign (Standard/Booster, flip animation)
- Play & Trade page (ganti Marketplace)
- QR camera scanner di /scan
- Physical fulfillment pipeline (6 parts)
- Profile page redesign (hapus Quick Actions, collection di kanan)
- Language cleanup (Indonesia → Inggris)
- Bug fix display status (fulfillmentStatus → displayStatus)
- CONTRACT_ADDRESS verified di Vercel production
- Laporan: `docs/compose/reports/2026-07-28-final-session-report.md`

### AI Vision (Gemini): DITUNDA
- **Status**: DITUNDA (bukan gagal/blocked). Kode referensi tetap di `lib/vision.ts`.
- **Alasan**: Prioritas dialihkan ke stabilisasi fitur inti + branding. Timeline project lebih panjang dari perkiraan awal.
- **WAJIB dikerjakan ulang sebelum submission final** — syarat kelayakan tema hackathon "AI x Web3".
- **Target revisit**: 2-3 minggu sebelum deadline submission final (tanggal pasti perlu ditentukan user).
- **Saat ini**: `/api/scan` berfungsi penuh tanpa vision (QR-lookup on-chain vs MongoDB match).

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
