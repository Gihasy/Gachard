# Architecture Decision Records

## ADR-001: Token Standard — BEP-1155
**Status**: Accepted
**Decision**: Gunakan BEP-1155 untuk kartu (bukan BEP-721).
**Reason**: BEP-1155 dipilih untuk efisiensi gas batch-operation (mint multiple token dalam satu transaksi) dan fleksibilitas multi-tipe-token dalam satu kontrak. **Catatan penting**: meskipun BEP-1155 mendukung fungible balance (beberapa user bisa hold quantity >1 untuk tokenId yang sama), di Gachard setiap kartu mendapat tokenId unik (one-token-per-instance) untuk mendukung pelacakan status vault per kartu sesuai ADR-004. Rarity disimpan sebagai metadata per tokenId (`cardRarity` mapping), bukan sebagai pengelompokan tokenId yang sama. Terbuka untuk kombinasi dengan BEP-721 di tahap produksi jika perlu keunikan individual (mis. edisi legendary bernomor).

## ADR-002: Wallet — Custodial, Tersembunyi dari User
**Status**: Accepted
**Decision**: User login via Google OAuth; wallet dibuat otomatis oleh backend, private key disimpan di server. User hanya kenal username `@user`, tidak pernah melihat wallet address.
**Reason**: Filosofi inti produk — blockchain harus sepenuhnya tersembunyi dari end-user demi UX mainstream, menghindari stigma Web3/crypto.

## ADR-003: Gas Fee — Disponsori Platform
**Status**: Accepted
**Decision**: Semua transaksi (mint, print, redeem) dieksekusi backend atas nama user; backend/platform yang menanggung gas fee.
**Reason**: User tidak boleh pernah pegang crypto atau tahu konsep gas fee.
**Known limitation**: satu wallet admin/relayer menjadi titik sentralisasi — perlu multi-sig atau custodian pihak ketiga di tahap produksi.

## ADR-004: State Machine Kartu — Lock In-Place via Status Flag, Bukan Burn
**Status**: Accepted (diklarifikasi 28 Juli 2026)
**Decision**: NFT tidak pernah di-burn saat print. Status berubah `Digital → Vaulted` (transfer ke alamat vault, transfer normal ditolak selama status ini) `→ Digital` (redeem, transfer ke pemilik baru). **Klarifikasi on-chain**: Deployed contract `requestPrint()` melakukan `_update(ownerAddress, address(this))` yang memindahkan NFT ke vault (contract address). `_update()` override memblokir transfer biasa saat `cardStatus == Vaulted`. NFT secara on-chain pindah ke contract saat vault, bukan tetap di wallet user.
**Reason**: Riwayat/provenance tetap utuh dalam satu token ID, lebih sederhana untuk fitur AI-scan provenance, dan lebih intuitif untuk narasi produk ("dikunci", bukan "dihancurkan").
**Verified**: 28 Juli 2026 — `safeTransferFrom` pada token Vaulted (tokenId 46) REVERT dengan pesan "Card is vaulted, transfer blocked". Token Digital (tokenId 45) bisa ditransfer normal.

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

## ADR-017: Arsitektur Backend — Next.js API Routes Sebagai Satu-Satunya Backend
**Status**: Accepted
**Decision**: Seluruh backend logic (auth, wallet, transaksi blockchain, rate-limiting) dijalankan lewat Next.js API routes (`app/api/`). Backend FastAPI terpisah (`backend/`) dihapus sepenuhnya.
**Reason**: Tiga opsi hosting backend terpisah (Koyeb, Railway, Fly.io) tertutup atau wajib kartu kredit; Render bermasalah untuk kartu yang tersedia. Next.js API routes sudah ter-deploy di Vercel tanpa biaya tambahan, mengurangi kompleksitas infrastruktur dari 2 service menjadi 1.
**Supersedes**: Referensi ke FastAPI/Render/Railway di ADR-012 dan ADR-015 tidak lagi berlaku untuk backend.

## ADR-018: Pola Async untuk Transaksi Blockchain
**Status**: Accepted
**Decision**: Semua endpoint yang berinteraksi dengan smart contract menggunakan pola async:
1. Endpoint langsung return `{status: "pending", txHash: null}` begitu transaksi dikirim ke chain, TIDAK menunggu konfirmasi.
2. Status transaksi disimpan di MongoDB collection `transactions`, diupdate jadi `confirmed`/`failed` lewat proses terpisah.
3. Frontend polling endpoint `/api/transactions?txId=...` setiap beberapa detik sampai dapat `confirmed`.
**Reason**: Blockchain confirmation bisa memakan waktu 3-15 detik di BNB testnet. Menunggu konfirmasi di dalam request HTTP yang sama berisiko timeout di serverless function (Vercel default 10s). Pola async juga lebih scalable dan memungkinkan retry/resilience.

## ADR-019: Rate-Limiting Berbasis MongoDB untuk Redeem
**Status**: Accepted
**Decision**: Rate-limiting untuk `redeemCard()` menggunakan MongoDB collection `rate_limits`, bukan in-memory storage. Maksimal 5 percobaan per user per menit (lihat ADR-006). Setiap percobaan dicatat dengan window timestamp per menit.
**Reason**: Serverless function di Vercel bersifat stateless — in-memory storage tidak konsisten antar invocation. MongoDB memastikan rate-limit tetap efektif meski request diarahkan ke instance yang berbeda.

## ADR-020: Enkripsi Private Key di Database
**Status**: Accepted
**Decision**: Semua private key (wallet user dan wallet admin) dienkripsi menggunakan AES-256-GCM sebelum disimpan di MongoDB. Secret key disimpan di environment variable `ENCRYPTION_SECRET_KEY` (minimal 32 karakter), bukan di database. Saat dipakai untuk sign transaksi, private key didekripsi terlebih dahulu.
**Reason**: Private key plaintext di database adalah risiko keamanan kritis — jika database bocor, semua wallet bisa dicuri. AES-256-GCM menyediakan authenticated encryption (integrity + confidentiality). Secret key di env var memastikan kompromi database saja tidak cukup untuk mendekripsi.

## ADR-021: Pack 8 Kartu dengan Jaminan Rare+
**Status**: Accepted
**Decision**: Setiap pack berisi 8 kartu dengan harga 500 Credit. 7 kartu mengikuti odds table normal, 1 kartu dijamin Rare+ (Rare/Epic/Legendary dengan bobot relatif 20/8/2 dinormalisasi). Mint via `mintBatch()` atomik (1 transaksi untuk seluruh pack, bukan 8x `mintCard` terpisah). Slot jaminan di-shuffle supaya tidak selalu di posisi sama.
**Reason**: 8 kartu per pack lebih menarik secara visual untuk demo (grid 2x4) dan memberikan pengalaman "unboxing" yang lebih kaya. Jaminan Rare+ meningkatkan kepuasan user tanpa mengorbankan distribusi rarity keseluruhan. `mintBatch()` atomik menghemat gas dan memastikan konsistensi (semua atau tidak sama sekali).
**Supersedes**: Referensi sebelumnya yang menyebut "1 kartu per pembelian".

## ADR-022: AI Vision (Gemini) — Ditunda, Bukan Dihapus
**Status**: DITUNDA — kode `lib/vision.ts` tetap ada di repo, tapi tidak dipanggil dari endpoint mana pun.
**Decision**: AI Vision (Google Gemini) untuk analisis visual kartu di-DEFER dari scope hackathon saat ini. Kode referensi tetap di `lib/vision.ts` untuk dipakai ulang nanti. Semua verifikasi kartu saat ini mengandalkan QR-lookup on-chain vs MongoDB match (cache-based, tanpa elemen vision).
**Alasan penundaan**: Prioritas dialihkan ke stabilisasi fitur inti dan branding terlebih dahulu, dengan timeline project yang lebih panjang dari perkiraan awal.
**WAJIB dikerjakan kembali sebelum deadline submission final**, karena ini syarat kelayakan tema hackathon "AI x Web3" yang wajib di semua track — bukan fitur opsional yang boleh hilang dari submission akhir.
**Target revisit**: 2-3 minggu sebelum deadline submission final (tanggal pasti perlu ditentukan user).

## ADR-024: Marketplace — Functional Trade System
**Status**: Accepted — supersedes ADR-010
**Decision**: Implement full marketplace with listing, buying, cancelling. Cards listed via `isListed` flag (MongoDB) + `marketplaceTransfer()` on-chain. Marketplace fee 8%. FVM (Fair Value Market) calculates average sold price per template. AI-powered market insight and price suggestion via Gemini API. Print blocked while card is listed.
**Reason**: Enhances demo value for hackathon. Shows full card lifecycle: mint → collect → trade → print → redeem. Blockchain abstraction maintained — users see Credit prices, not crypto.

## ADR-025: AI Anomaly Detection Oracle untuk Trade
**Status**: Accepted
**Decision**: Deteksi pola wash-trading pada transaksi marketplace menggunakan pendekatan Oracle:
1. **Sinyal deterministik** (`fraud-signals.ts`): `repeatPairCount` (frekuensi pasangan wallet), `priceDeviationPct` (penyimpangan harga dari FVM), `resaleSpeedHours` (kecepatan resale).
2. **AI risk scoring** (`risk-score.ts`): Gemini mensintesis ketiga sinyal jadi skor 0-100. Threshold `flagged = riskScore >= 70`.
3. **On-chain Oracle** (`recordVerification()`): Hasil skor dan flag di-post ke smart contract, tercatat permanen di blockchain.
4. **FVM exclusion**: Transaksi dengan `flagged === true` dikecualikan dari perhitungan FVM untuk mencegah manipulasi harga.
5. **Non-blocking**: Semua scoring terjadi SETELAH transaksi selesai — tidak pernah memblokir atau membatalkan trade.
**Reason**: Wash-trading (A jual ke B, B jual balik ke A dengan harga naik) mengancam integritas FVM dan ekonomi marketplace. Oracle pattern memastikan hasil verifikasi transparan dan teraudit di on-chain, bukan hanya di database backend.

## ADR-026: Dismantle & Crystal — Burn-to-Earn Currency
**Status**: Accepted
**Decision**: Kartu Digital dapat di-"dismantle" (burn permanen on-chain) untuk mendapatkan Crystal — currency baru yang TIDAK bisa dibeli, di-top-up, atau ditransfer. Crystal hanya bisa didapat dari dismantle. Collection `crystal_balances` terpisah total dari `credits` supaya kedua currency tidak pernah tercampur. Kartu yang sudah di-burn berubah status jadi `"Burned"` di MongoDB (bukan dihapus) untuk menjaga provenance dan transparansi via Scan. Burned card tidak muncul di grid Collection aktif tetapi tetap bisa dicari by Card ID.
**Dismantle rates**: Common=20, Rare=50, Epic=120, Legendary=300 Crystal (proporsional ke rentang harga FVM).
**On-chain**: `burnCard(tokenId, owner)` memanggil OpenZeppelin `_burn()` yang menghancurkan token ERC1155 secara permanen. Hanya kartu Digital yang bisa di-burn — kartu Vaulted diblokir oleh `_update()` override yang sudah ada.
**Menggantikan konsep Buyback**: Dismantle & Crystal menggantikan rencana buyback — burn permanen on-chain, currency baru non-purchasable/non-cashable, tanpa liabilitas finansial.
**Roadmap (TIDAK dibangun di sesi ini)**: Sistem trading Crystal antar-user akan menginfrastruktur ulang Marketplace yang sudah ada. Crystal akan jadi currency alternatif untuk listing dan membeli kartu dari user lain.
**Reason**: Burn on-chain membuktikan kartu benar-benar dihancurkan (transparan, teraudit di BSCScan). Crystal sebagai non-purchasable currency menghindari liabilitas finansial dan regulasi. Pemisahan collection mencegah bug cross-currency.
**Known limitation**: Setelah burn, `cardStatus(tokenId)` on-chain tetap menunjukkan nilai terakhir sebelum burn (tidak di-reset ke state "Burned") karena token ERC1155 sudah tidak ada setelah `_burn()`. Sumber kebenaran status "Burned" ada di MongoDB (`cards.status === "Burned"`). Perlu diingat kalau nanti ada fitur yang membaca `cardStatus` langsung dari chain tanpa cross-check MongoDB — perlu cek `balanceOf(owner, tokenId) == 0` sebagai indikator burn.
