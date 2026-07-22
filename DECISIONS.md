# Architecture Decision Records

## ADR-001: Token Standard — BEP-1155
**Status**: Accepted
**Decision**: Gunakan BEP-1155 untuk kartu (bukan BEP-721).
**Reason**: Kartu sama = fungible dalam rarity yang sama, lebih efisien untuk pack-based system. Terbuka untuk kombinasi dengan BEP-721 di tahap produksi jika perlu keunikan individual (mis. edisi legendary bernomor).

## ADR-002: Wallet — Custodial, Tersembunyi dari User
**Status**: Accepted
**Decision**: User login via Google OAuth; wallet dibuat otomatis oleh backend, private key disimpan di server. User hanya kenal username `@user`, tidak pernah melihat wallet address.
**Reason**: Filosofi inti produk — blockchain harus sepenuhnya tersembunyi dari end-user demi UX mainstream, menghindari stigma Web3/crypto.

## ADR-003: Gas Fee — Disponsori Platform
**Status**: Accepted
**Decision**: Semua transaksi (mint, print, redeem) dieksekusi backend atas nama user; backend/platform yang menanggung gas fee.
**Reason**: User tidak boleh pernah pegang crypto atau tahu konsep gas fee.
**Known limitation**: satu wallet admin/relayer menjadi titik sentralisasi — perlu multi-sig atau custodian pihak ketiga di tahap produksi.

## ADR-004: State Machine Kartu — Lock & Transfer ke Vault, Bukan Burn
**Status**: Accepted
**Decision**: NFT tidak pernah di-burn saat print. Status berubah `Digital → Vaulted` (transfer ke alamat vault, transfer normal ditolak selama status ini) `→ Digital` (redeem, transfer ke pemilik baru).
**Reason**: Riwayat/provenance tetap utuh dalam satu token ID, lebih sederhana untuk fitur AI-scan provenance, dan lebih intuitif untuk narasi produk ("dikunci", bukan "dihancurkan").

## ADR-005: Redeem Code — Hash Overwrite per Siklus Print
**Status**: Accepted
**Decision**: Setiap `requestPrint()` men-generate kode acak baru; hash-nya menimpa (overwrite) hash lama di `storedHash[tokenId]`. Kode plaintext tidak pernah disimpan permanen atau ditampilkan di UI/on-chain.
**Reason**: Kode dari siklus print sebelumnya otomatis kedaluwarsa tanpa perlu daftar "used code" terpisah. Mencegah kartu fisik lama (belum digosok) tetap valid setelah kartu di-print ulang untuk pemilik baru.

## ADR-006: Redeem — Akses Lewat Backend Saja (Rate-Limited)
**Status**: Accepted
**Decision**: Fungsi `redeemCard()` hanya bisa diakses lewat backend API (login → input kode), bukan panggilan on-chain bebas dari wallet mana pun. Backend menerapkan rate-limiting (mis. maksimal 5 percobaan/menit/akun).
**Reason**: Karena gas disponsori platform, akses bebas berisiko disalahgunakan untuk spam brute-force tebak kode dengan biaya ditanggung platform, bukan penyerang.

## ADR-007: `recipientAddress` Eksplisit, Bukan `msg.sender`
**Status**: Accepted
**Decision**: `redeemCard()` menerima parameter eksplisit `recipientAddress` (wallet user yang sedang login), bukan mengandalkan `msg.sender`.
**Reason**: Karena backend yang memanggil kontrak atas nama user, `msg.sender` sebenarnya adalah wallet backend/relayer, bukan wallet user — perlu parameter eksplisit supaya kartu terkirim ke user yang benar.

## ADR-008: Payment — Dua Jalur Terpisah (Credit vs Direct)
**Status**: Accepted
**Decision**: **Credit** (top-up nominal bebas via Stripe test-mode satu kali, disimpan sebagai integer/sen di database, dipakai khusus untuk beli pack) dipisah total dari **Direct Payment** (Stripe test-mode per transaksi, wajib untuk request print, tidak bisa memakai credit).
**Reason**: Request print punya biaya nyata (cetak + kirim) yang sengaja dipisahkan dari ekonomi virtual pack. Mengurangi integrasi Stripe berulang untuk setiap pembelian pack.

## ADR-009: Odds/Rarity — Disimpan di Backend, Bukan On-chain
**Status**: Accepted
**Decision**: Distribusi rarity (odds table) disimpan di database backend, bisa diubah tanpa redeploy kontrak. Hanya hasil akhir reveal yang tercatat on-chain.
**Reason**: Fleksibilitas tuning odds selama testing tanpa biaya/waktu redeploy kontrak.

## ADR-010: Marketplace — "Coming Soon", Bukan Fitur Demo
**Status**: Accepted
**Decision**: Marketplace hanya ditampilkan sebagai UI placeholder "Coming Soon" untuk hackathon, tidak difungsikan (tidak ada trading/listing sungguhan).
**Reason**: Bukan differentiator inti produk; waktu dialihkan ke core loop mint–vault–redeem dan fitur AI scan yang wajib untuk tema hackathon.

## ADR-011: Artwork Kartu — AI-generate Manual di Awal
**Status**: Accepted
**Decision**: Artwork kartu di-generate sekali di awal secara manual, bukan generate-on-demand saat reveal.
**Reason**: Keandalan demo — generate-on-demand menambah kompleksitas dan waktu tunggu yang berisiko saat presentasi live.

## ADR-012: Migrasi Emergent → Claude Code + Hosting Mandiri
**Status**: Accepted
**Decision**: Gunakan Emergent (via 7-day pass + bulan pertama Standard, ~350 credit) khusus untuk Sprint 1–3 (fondasi, mint, vault/redeem state machine). Setelah itu, push kode ke GitHub dan lanjutkan Sprint 4–6 dengan Claude Code (Pro, $20/bulan). Deploy mandiri ke Vercel (frontend), Render/Railway (backend), MongoDB Atlas (database) — semua free tier untuk skala demo hackathon. Smart contract tetap deploy langsung ke BNB testnet, independen dari pilihan hosting.
**Reason**: Model biaya Emergent (credit-per-aksi) tidak predictable dan mahal untuk pemakaian panjang; Claude Code (subscription flat) lebih predictable untuk pekerjaan iteratif di Sprint 4–6. Stack yang dipakai Emergent (React/Next.js + FastAPI + MongoDB) portabel ke hosting standar mana pun.
**Catatan migrasi**: audit integrasi Stripe (dan integrasi Playbook lain) untuk memastikan memakai SDK/API langsung, bukan bergantung pada konfigurasi khusus environment Emergent.

## ADR-013: Delivery Platform — PWA (Progressive Web App)
**Status**: Accepted
**Decision**: Gachard dibangun sebagai PWA (manifest.json + service worker di atas stack React/Next.js), bukan native app terpisah untuk iOS/Android.
**Reason**: Menghindari proses App Store review yang berisiko terhambat kebijakan Apple soal NFT/digital collectibles (lihat catatan awal soal Apple App Store policy). Satu codebase untuk semua platform, sesuai timeline hackathon. Kamera (untuk AI-scan) dan Stripe checkout tetap berfungsi normal di konteks web/PWA.
**Known limitation**: push notification di iOS PWA masih lebih terbatas dibanding native app — tidak relevan untuk demo hackathon, dicatat untuk pertimbangan produksi.

## ADR-014: Dokumentasi Tool-Agnostic + Adapter Per Tool
**Status**: Accepted
**Decision**: Dokumen inti project (`README.md`, `MEMORY.md`, `DECISIONS.md`, `docs/`, `sprints/`) ditulis murni sebagai markdown tool-agnostic. Setiap AI coding tool yang dipakai (Emergent, Claude Code, MiMo Code, dst.) punya satu file "adapter" kecil (`CLAUDE.md` untuk Claude Code, `.mimo/config.md` untuk MiMo Code) yang menunjuk ke dokumen inti yang sama — bukan menduplikasi isi.
**Reason**: Tim mempertimbangkan berganti-ganti tool/model (Emergent → Claude Code → MiMo Code dengan model MiMo V2.5 Pro, kemungkinan berganti lagi). Dengan dokumentasi inti yang tidak terikat tool, perpindahan antar tool tidak memerlukan penulisan ulang konteks — cukup buat adapter baru bila perlu.
**Catatan**: MiMo Code (rilis awal, masih tahap alpha per pengecekan Juli 2026) mendukung koneksi ke berbagai provider LLM (bukan terkunci ke model MiMo saja) dan mengimpor konfigurasi dari Claude Code secara otomatis saat migrasi — memperkuat kelayakan pendekatan adapter ini. Karena masih software tahap awal, tetap disiplin commit Git yang sering sebagai fallback bila tool ini tidak stabil.

## ADR-015: Ganti Rencana — MiMo Code (Berbayar, Model V2.5 Pro) Sejak Awal, Tanpa Emergent
**Status**: Accepted — menggantikan sebagian ADR-012
**Decision**: Tidak menggunakan Emergent sama sekali. Seluruh development (Sprint 1–6) dilakukan dengan MiMo Code (Token Plan berbayar, model `mimo-v2.5-pro`) sejak hari pertama.
**Reason**: Menghindari biaya credit Emergent sepenuhnya; MiMo Code + model V2.5 Pro dinilai cukup kapabel untuk agentic coding jangka panjang berdasarkan riset awal (lihat diskusi 21 Juli 2026).
**Konsekuensi**:
- Tidak ada VM/hosting otomatis seperti Emergent — hosting harus disiapkan mandiri sejak Sprint 1 (Vercel/Render/Railway/MongoDB Atlas), bukan menunggu migrasi di Sprint 4.
- Smart contract deploy langsung via Foundry ke BNB testnet, tanpa perantara Playbook Emergent.
- `.mimo/config.md` menjadi adapter utama (bukan `CLAUDE.md`), tetap menunjuk ke dokumen inti tool-agnostic yang sama (lihat ADR-014).
- Karena MiMo Code masih tahap awal/alpha per Juli 2026, disiplin commit Git yang sering menjadi lebih penting sebagai fallback.

## ADR-015: Tool Utama — MiMoCode (mimo-v2.5-pro) Sejak Awal, Tanpa Emergent
**Status**: Accepted (menggantikan pendekatan di ADR-012)
**Decision**: Seluruh development (Sprint 1–6) memakai MiMoCode (model `mimo-v2.5-pro`, berbayar via Xiaomi MiMo Platform atau custom provider pihak ketiga) sejak awal. Tidak memakai Emergent sama sekali. Setup git + GitHub repo dilakukan manual sejak Sprint 1 (bukan auto-sync seperti Emergent). Hosting mandiri (Vercel/Render/MongoDB Atlas, free tier) disiapkan sejak Sprint 1, bukan menunggu migrasi di pertengahan project.
**Reason**: Menyederhanakan jadi satu tool sepanjang project (bukan dua tool berbeda di fase berbeda), model biaya lebih predictable (Token Plan/pay-as-you-go), dan MiMoCode punya sistem memori persisten (`MEMORY.md` auto-loaded, task tracking, checkpoint) yang cocok dengan pendekatan dokumentasi kita.
**Supersedes**: ADR-012 (rencana Emergent → Claude Code) tidak lagi berlaku.

## ADR-016: Koreksi — File Auto-Loaded MiMoCode
**Status**: Accepted
**Decision**: `MEMORY.md` adalah file resmi yang otomatis dibaca MiMoCode setiap sesi (bagian dari sistem memori persisten bawaannya: `MEMORY.md`, `checkpoint.md`, `notes.md`, `tasks/<id>/progress.md`). `.mimo/config.md` dan `CLAUDE.md` **bukan** file yang otomatis dibaca MiMoCode — keduanya dipertahankan sebagai referensi manusia/tool lain (mis. jika kembali ke Claude Code nanti), bukan mekanisme auto-load untuk MiMoCode.
**Reason**: Klarifikasi teknis setelah pengecekan langsung ke dokumentasi resmi MiMoCode (Juli 2026) — instruksi utama untuk agent dipindahkan ke bagian atas `MEMORY.md` supaya benar-benar terbaca otomatis.
