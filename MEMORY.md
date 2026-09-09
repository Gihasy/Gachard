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
Rangkuman menyeluruh project selesai (7 September 2026). Siap lanjut eksekusi perubahan/fitur berikutnya.

## Project Status
- PRD selesai — lihat `docs/00-project-overview.md` (ringkas) dan `PRD-Gachard-Hackathon.md` (lengkap)
- Tool utama: MiMoCode (model mimo-v2.5-pro, berbayar) sejak awal — TIDAK memakai Emergent (lihat ADR-015)
- Hosting: Vercel (frontend + backend via API routes) + MongoDB Atlas (database), semua free tier
- **Arsitektur final**: Next.js API routes sebagai SATU-SATUNYA backend (lihat ADR-017). FastAPI sudah dihapus.
- **Enkripsi**: Private key + redeem code dienkripsi AES-256-GCM (ADR-020)
- Kontrak aktif: `0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4` (AI Anomaly Detection Oracle — dengan recordVerification)
- Kontrak sebelumnya: `0x56390137c171b3167D4055d199DA8Bc8eCeE219c` (lama, sudah tidak aktif)
- Admin wallet baru: `0x3F4CBDCb5bFb014d63C07400DcD11513DB5F7b56`
- Admin wallet lama: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa` (masih di-recognize sebagai "Gachard" di UI)
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
- Credential: `ADMIN_USERNAME=[REDACTED]`, `ADMIN_PASSWORD=[REDACTED]`
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

### Trade Marketplace: SELESAI (20 Agustus 2026)
- **Smart Contract**: `marketplaceTransfer()` added to GachardCard.sol — owner-only, verifies Digital status + holder, transfers NFT, updates lastOwner. 38/38 Foundry tests pass.
- **New Contract**: `0x9409fcc78fa2b08f6300bfcfe7dcf43e6be7d58a` (replaces `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a`)
- **Data Model**: `listings` MongoDB collection (listingId, cardId, sellerId, price, status), `cards.isListed`/`cards.listingId` fields, transaction types "listed"/"sold"
- **FVM**: Fair Value Market — calculates average sold price per template, fallback to rarity average, floor = FVM * 0.7
- **Marketplace Fee**: 8% — seller receives price * 0.92
- **API Routes**: POST/GET `/api/marketplace/listings`, POST cancel, POST buy (async pattern ADR-018 with pending transfer), GET `/api/marketplace/fvm`, GET `/api/marketplace/insight`, GET `/api/marketplace/suggest`
- **AI Features**: Market Insight (Gemini, cached 1 hour) + Price Suggestion (per-template, in listing modal)
- **UI**: `/trade` page (listing grid + FVM + Market Insight + rarity filter + clickable cards with quick info popup), ListingModal (price input + FVM + AI suggestion), CardItem (List for Sale / Cancel Listing buttons, Listed badge, print guard)
- **Seed Script**: `frontend/scripts/seed-marketplace.ts` — ~25 dummy sold transactions with 3 ownership chains (Legendary 5x, Epic 4x, Rare 3x)
- **ADR-024**: Supersedes ADR-010 (marketplace "Coming Soon" → functional)

### Session 7 September 2026 — Ringkasan Perubahan (Part 1: Review)
- **Rangkuman menyeluruh project** sudah diselesaikan dan disimpan di plan file: `C:\Users\gigih\.commandcode\plans\gachard-full-project-summary.md`.
- **Scope review**: arsitektur final, stack, ADR kunci, alur domain, struktur repo, data layer, API surface, konfigurasi env/deploy, serta risiko/tech-debt.
- **Current state**: branch aktif `feat/ai-anomaly-detection-oracle`; sprint sudah selesai.

### Session 7 September 2026 — Ringkasan Perubahan (Part 2: New Wallet & Contract)
- **Wallet baru**: Generate wallet baru `0x3F4CBDCb5bFb014d63C07400DcD11513DB5F7b56` (private key baru) karena wallet lama bukan untuk address yang terdaftar.
- **Contract baru**: Deploy GachardCard baru ke `0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4` (tokenId mulai dari1).
- **Bug fixes**:
  - Trailing space di env vars Vercel → mint confirmation gagal. Fix: `.trim()` di semua tempat yang baca env vars.
  - `confirmMint` background task gagal di Vercel serverless → tambah client-side polling di collect page.
  - Listing ID tidak di-pass setelah create listing → cancel listing gagal. Fix: pass `listingId` dari API response.
  - QR scanner salah treat cardId sebagai claimId → fix: pass raw URL, parse di handleScan.
- **UI improvements**:
  - Transaction History label: "Claimed Shipping" → "Physical", "Redeemed" → "Digital"
  - Token ID di admin panel → clickable link ke BSCScan token URL + copy URL
  - Listing price ditampilkan di atas tombol "Cancel Listing" (CRYSTAL uppercase, crystal color)
  - Cart button disabled untuk listing sendiri di Trade page
  - QR code di Card Details → clickable link ke scan page
  - QR encode URL dinamis (pakai request.origin, bukan hardcoded env var)
  - Old admin wallet `0xF7DE...8DEa` → resolve ke "Gachard" di Transaction History
  - From → to transfer info dipindah ke paragraf baru
  - Transaction History dibatasi 3 item visible + scrollbar
  - Play page: tambah hero image dengan glow border effect
- **Deploy**: Semua perubahan di-push ke `main` → Vercel Production https://www.gachard.com

### Session 7 September 2026 — Ringkasan Perubahan (Part 2: Eksekusi)
- **Label “Real” → “Physical”** (11 file): Semua user-facing card status label diubah dari “Real” menjadi “Physical”. DB values tetap “Real” (tanpa migrasi data), display mapping di `status-map.ts` dan `getDisplayStatus()`.
  - `lib/status-map.ts`, `api/cards/route.ts`, `api/scan/route.ts`, `api/redeem/route.ts`
  - `components/CardItem.tsx`, `profile/page.tsx`, `scan/page.tsx`, `play/page.tsx`, `dismantle/page.tsx`
  - `admin/page.tsx` (StatusPill + FULFILLMENT_DISPLAY mapping)
- **Bug fix: redeem status stuck** (`lib/transactions.ts`): Polling fallback `confirmTransaction()` tidak reset `fulfillmentStatus` ke `null` saat redeem berhasil. Fix: tambah `fulfillmentStatus: null` + `$unset: { deliveredAt, claimId }`.
- **Admin: Claimed status + redeemer info** (4 file):
  - `api/redeem/route.ts`: Track redeemer di `redeem_codes` collection (`redeemedBy`, `redeemedAt`)
  - `api/admin/print-requests/route.ts`: Return redeemer info (username, wallet)
  - `admin/page.tsx`: Show “Status: Claimed” + `@username` + wallet address
  - `api/admin/fix-claimed-cards/route.ts`: **Baru** — fix endpoint untuk kartu yang sudah terlanjur stuck “Physical”
- **UI cleanup** (3 file): Hapus eyebrow labels (“Your Account”, “Verify Authenticity”, “Marketplace”) dari Profile, Scan, Trade pages. Samakan warna judul pakai `text-gradient-aurora`.
- **Submission repo** (`Gachard-Submission`): Force push dengan clean history (single commit, no secrets). Docs di-update (`00-project-overview.md` — marketplace fungsional, dismantle, anomaly detection). Hapus `card-artwork-guideline.md` dan `pitch-deck-outline.md`.
- **Fork Monad Metropolis**: Folder `D:\gachard-monad` dibuat, git init, remote → `Gachard-Monad.git`. Config diupdate untuk Monad testnet (`RPC_URL`, `CHAIN_ID=10143`). Belum di-push.
- **Deploy**: Semua perubahan di-push ke `main` → Vercel auto-deploy ke https://www.gachard.com

### Session 7 September 2026 — Ringkasan Perubahan (Part 3: UI Fixes & Submission)
- **Bug fixes lanjutan**:
  - Contract address trailing space di admin page → `.trim()` di `CONTRACT_ADDR`
  - Listing ID tidak di-pass setelah create listing → fix: pass dari API response
  - QR scanner salah parse cardId sebagai claimId → fix: pass raw URL ke handleScan
  - Listing price tidak muncul setelah re-list → fix: update local state dengan `listingId` dan `listingPrice`
- **UI improvements**:
  - Transaction History label: "Claimed Shipping" → "Physical", "Redeemed" → "Digital"
  - Token ID di admin panel → clickable link ke BSCScan (`/token/{addr}?a={id}#transactions`) + copy URL
  - Listing price di Card Item → "500 CRYSTAL" uppercase, crystal color, glass background
  - Cart button disabled untuk listing sendiri di Trade page
  - QR code di Card Details → clickable link ke scan page
  - QR encode URL dinamis (pakai `request.origin`, bukan hardcoded env var)
  - Old admin wallet `0xF7DE...8DEa` dan `0x869E...215e` → resolve ke "Gachard" di Transaction History
  - From → to transfer info dipindah ke paragraf baru (bukan inline)
  - Transaction History dibatasi 3 item visible + scrollbar (di Scan page dan Card Details modal)
  - Play page: tambah hero image dengan glow border effect (`max-w-6xl`, `box-shadow` cosmic-violet)
  - Back to Scan button muncul saat claim gagal
- **Submission repo**: Push ke https://github.com/Gihasy/gachard-bnbchain.git (public, exclude internal files, README bahasa Indonesia)
- **Deploy**: Semua perubahan di-push ke `main` → Vercel Production https://www.gachard.com

### Session 9 September 2026 — Ringkasan Perubahan
- **Update play-hero.png**: Gambar hero di halaman `/play` di-update dengan versi baru
- **Commit**: `feat(ui): update play hero image` (c80f1c7)
- **Deploy**: Push ke `main` → Vercel auto-deploy ke https://www.gachard.com

### Open Items (belum selesai)
1. **AI Vision (Gemini)** — DITUNDA, WAJIB dikerjakan sebelum submission final (syarat tema hackathon "AI x Web3")
2. **Clean Slate script**: `frontend/scripts/clean-slate.ts` — run with `cd frontend && npx tsx scripts/clean-slate.ts`

### Documentation Cleanup (7 September 2026)
- **10 file outdated dihapus**: Execution-Plan-Gachard.md, LAPORAN_AKHIR.md, UPDATE_REPORT.md, docs/SESSION_CHANGELOG.md, docs/BUG_FIX_REPORT.md, docs/PRIORITY_FIXES_REPORT.md, docs/compose/reports/status-lengkap.md, memory/test_credentials.md, memory/PRD.md, frontend/README.md
- **20 file diarsipkan ke `docs/archive/`**: Semua plan files (sprint 1-6, clean-slate, pack system, cart-wishlist, trade marketplace, AI anomaly detection, dismantle crystal, support gachard, server-side session, brand identity) + beberapa report outdated (latest-changes-deploy, github-changes-report, emergent-audit-final, pitch-deck-outline, card-artwork-guideline)
- **File yang dipertahankan**: Sprint reports (sprint-1-final.md s/d sprint-6-brand-identity-report.md), session reports (2026-07-28 s/d 2026-09-01), feature reports (ai-anomaly-detection-oracle, blockchain-abstraction, blockchain-hiding, dismantle-crystal, security-audit, support-gachard, pack-economy), DECISIONS.md, README.md, docs/00-project-overview.md

### Session 10 Agustus 2026 — Ringkasan Perubahan
- **Responsive Fixes**: All pages audited and fixed for mobile (320-425px)
  - PackCard: stack title + stats on mobile
  - HomeHowItWorks: smaller step cards
  - HomeCtaBand: responsive padding
  - TopUp presets: smaller text/padding
  - Collection empty state: responsive padding
  - Packs balance: flex-wrap
  - Scan loading states: responsive padding
- **Pack Reveal Fix**: Cards no longer cut off on mobile — responsive sizes 140px → 160px → 180px
- **Insufficient Balance**: Top Up button appears when balance error
- **Scan Bar Layout**: [Input] [Camera] [Scan] for both error and result states
- **Clean Slate**: Database reset (60 cards, 11 transactions deleted). Script at `frontend/scripts/clean-slate.ts`

### Session 4 Agustus 2026 — Ringkasan Perubahan
- 14 commit, 16 file berubah (+981 / -458 lines)
- **Scan Fix**: Hapus false "data mismatch" (cache freshness check), tambah Scan Again top bar
- **Card Detail Modal**: Overlay modal saat klik kartu di Collection/Profile — fetch dari `/api/scan`, tampilkan verification, metadata, transaction history (3 terakhir + expand)
- **Button Unification**: Semua tombol aksi pakai `btn-primary` gradient (aurora-pink → cosmic-violet → electric-blue)
- **Dead Code Cleanup**: Hapus `/api/admin/accept-print`, protect `/api/seed-templates`, hapus dead links (Footer, Login, Marketplace)
- **DB Query Optimization**: `/api/scan`, `/api/transactions`, `/api/admin/cards` — filter by relevant IDs, bukan fetch all
- **Mint Flow Fix**: `waitForReceipt()` polling (3x, 1s/2s/3s) ganti blocking `tx.wait()` — mencegah timeout 15s
- **Auto-Reconciliation**: `/api/cards` cek pending cards → `confirmTransaction()` otomatis saat user buka collection
- **Admin Health Dashboard**: Tab baru di `/admin` — monitor pending cards dengan duration, stale count, Confirm All button
- **Clean Slate**: Database dibersihkan (75 cards, 22 tx, 4 redeem_codes, 4 shipping, 4 payments dihapus)
- Laporan: `docs/compose/reports/2026-08-04-session-report.md`

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
- **Routes sudah English**: `/collect` (packs), `/play`, `/trade` (marketplace), `/collection`, `/profile`, `/scan`, `/topup`
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
