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
**Keadaan implementasi (dicatat 21 September 2026)**: pemisahan dua jalurnya sudah berjalan, tetapi **Stripe belum pernah diintegrasikan**. Tidak ada dependency `stripe` di `frontend/package.json`. `POST /api/credits/topup` menambah saldo langsung di database, dan `POST /api/print/checkout` mencatat `stripePaymentId: "sim_<timestamp>"`. Jadi seluruh pembayaran saat ini **disimulasikan**. Jangan mengklaim integrasi Stripe di materi submission atau pitch sampai dependency dan webhook-nya benar-benar ada.

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

## ADR-015: Tool Utama — MiMoCode (mimo-v2.5-pro) Sejak Awal, Tanpa Emergent
**Status**: Accepted — menggantikan ADR-012
**Catatan penomoran**: Sebelumnya ADR ini tercatat dua kali dengan nomor yang sama (dua entri terpisah, isi saling melengkapi). Digabung menjadi satu entri pada 16 September 2026.
**Decision**: Tidak memakai Emergent sama sekali. Seluruh development Sprint 1–6 memakai MiMoCode (model `mimo-v2.5-pro`, berbayar via Xiaomi MiMo Platform atau custom provider pihak ketiga) sejak hari pertama. Setup git + GitHub repo manual sejak Sprint 1 (bukan auto-sync seperti Emergent). Hosting mandiri (Vercel + MongoDB Atlas, free tier) disiapkan sejak Sprint 1, bukan menunggu migrasi di pertengahan project.
**Reason**: Menghindari biaya credit Emergent; satu tool sepanjang project (bukan dua tool di fase berbeda); biaya lebih predictable (Token Plan/pay-as-you-go); dan MiMoCode punya memori persisten (`MEMORY.md` auto-loaded, task tracking, checkpoint) yang cocok dengan pendekatan dokumentasi project ini.
**Konsekuensi**:
- Tidak ada VM/hosting otomatis seperti Emergent — hosting disiapkan mandiri sejak Sprint 1.
- Smart contract deploy langsung via Foundry ke BNB testnet, tanpa perantara Playbook Emergent.
- Karena MiMoCode masih tahap alpha per Juli 2026, disiplin commit Git yang sering jadi fallback penting.
**Supersedes**: ADR-012 (rencana Emergent → Claude Code) tidak lagi berlaku dalam bentuk aslinya.
**Catatan lanjutan (16 September 2026)**: Development kini dilanjutkan memakai **Claude Code**, bukan MiMoCode. Lihat ADR-029.

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

## ADR-021: Pack — Dua Tipe (Standard 5 Kartu / Booster 10 Kartu)
**Status**: Accepted — direvisi 16 September 2026 agar sesuai implementasi
**Decision**: Ada dua tipe pack (`PACK_TYPES` di `app/api/mint/route.ts`):

| Tipe | Harga | Jumlah kartu | Jaminan Rare+ |
|---|---|---|---|
| Standard | 500 Credit | 5 | 1 |
| Booster | 800 Credit | 10 | 2 |

Kartu non-jaminan mengikuti odds table normal; slot jaminan (Rare/Epic/Legendary, bobot relatif 20/8/2 dinormalisasi) di-shuffle supaya tidak selalu di posisi yang sama. Mint via `mintBatch()` atomik — satu transaksi untuk seluruh pack, bukan N kali `mintCard`.
**Reason**: Dua tipe pack memberi pilihan harga dan memperkaya demo. `mintBatch()` atomik menghemat gas dan menjamin konsistensi (semua atau tidak sama sekali).
**Riwayat revisi**: Versi awal ADR ini menetapkan "pack tunggal 8 kartu @ 500 Credit", yang kemudian menyimpang dari kode tanpa dicatat. Direvisi agar ADR kembali menjadi sumber kebenaran yang akurat.
**Supersedes**: Referensi lama yang menyebut "1 kartu per pembelian" dan "pack 8 kartu".

## ADR-022: AI Vision (Gemini) — Ditunda, Bukan Dihapus
**Status**: DITUNDA — kodenya sudah tidak ada di repo.
**Decision**: AI Vision (Google Gemini) untuk analisis visual kartu di-DEFER dari scope hackathon saat ini.
**Koreksi (21 September 2026)**: versi awal ADR ini menyatakan kode referensi tetap disimpan di `lib/vision.ts`. File itu ternyata sudah terhapus pada commit `c0c97b0`, jadi tidak ada kode vision yang tersisa di repo. Kalau fitur ini dihidupkan lagi, implementasinya ditulis dari nol atau diambil dari riwayat git. Semua verifikasi kartu saat ini mengandalkan QR-lookup on-chain vs MongoDB match (cache-based, tanpa elemen vision).
**Alasan penundaan**: Prioritas dialihkan ke stabilisasi fitur inti dan branding terlebih dahulu, dengan timeline project yang lebih panjang dari perkiraan awal.
**WAJIB dikerjakan kembali sebelum deadline submission final**, karena ini syarat kelayakan tema hackathon "AI x Web3" yang wajib di semua track — bukan fitur opsional yang boleh hilang dari submission akhir.
**Target revisit**: 2-3 minggu sebelum deadline submission final (tanggal pasti perlu ditentukan user).

## ADR-023: (Nomor Tidak Terpakai)
**Status**: N/A
**Catatan**: Tidak pernah ada ADR-023. Nomor ini terlewat saat penulisan dan dicatat di sini pada 16 September 2026 supaya celah penomoran tidak disangka dokumen yang hilang.

## ADR-024: Marketplace — Functional Trade System
**Status**: Accepted — supersedes ADR-010; direvisi 16 September 2026 (currency diluruskan jadi Crystal)
**Decision**: Implement full marketplace with listing, buying, cancelling. Cards listed via `isListed` flag (MongoDB) + `marketplaceTransfer()` on-chain. Marketplace fee 8%. FVM (Fair Value Market) calculates average sold price per template, dan listing ditolak di bawah floor 70% FVM. AI-powered market insight and price suggestion via Gemini API. Print blocked while card is listed, dan sebaliknya kartu yang punya riwayat cetak (`fulfillmentStatus` terisi) tidak bisa di-listing sama sekali.
**Currency**: listing dan pembelian memakai **Crystal**, bukan Credit — lihat ADR-026 untuk detail alur pembayaran, refund, dan payout penjual.
**Reason**: Enhances demo value for hackathon. Shows full card lifecycle: mint → collect → trade → print → redeem. Blockchain abstraction maintained — user melihat harga dalam Crystal, tidak pernah dalam satuan crypto.
**Riwayat revisi**: Versi awal ADR ini menulis "users see Credit prices", yang tidak pernah benar di kode — Marketplace memakai Crystal sejak diimplementasikan. Dikoreksi 16 September 2026.
**Rekonsiliasi pembelian (ditemukan dan ditutup 16 September 2026)**: kalau receipt on-chain belum terkonfirmasi dalam 3 percobaan `waitForReceipt`, `buy/route.ts` menulis kartu ke `status: "pending"` beserta `pendingSellerId`/`pendingListingPrice`. Sebelumnya field-field itu tidak pernah dibaca siapa pun dan `confirmTransaction()` tidak punya cabang `type: "sold"`, sehingga Crystal pembeli sudah dipotong tapi penjual tidak pernah dibayar dan kartu tersangkut selamanya di `pending`. Sekarang `confirmTransaction()` memanggil `settleSoldTransaction()` (`lib/transactions.ts`):
- Kartu dicari lewat `pendingTxHash`, **bukan** `tokenId`, karena tokenId tidak unik lintas kontrak.
- Receipt sukses: kartu pindah ke pembeli dengan status `Digital`, semua field `pending*` dibersihkan, lalu penjual dibayar `calculateSellerProceeds(price)`.
- Receipt revert: kartu dikembalikan ke penjual, Crystal pembeli di-refund penuh, dan listing diaktifkan kembali — sama dengan jalur gagal sinkron di `/buy`.
- Idempoten lewat klaim atomik ADR-028: hanya update dengan `modifiedCount === 1` yang boleh memindahkan Crystal, jadi rekonsiliasi berulang (Collection page + admin Health "Confirm All") tidak pernah membayar dua kali. Filter `status: "pending"` yang dipakai lebih ketat daripada guard `status: { $ne: "Burned" }`, jadi aturan ADR-028 tetap terpenuhi.
- Fee 8% sekarang hidup di satu tempat, `lib/marketplace.ts` (`MARKETPLACE_FEE_PERCENT`, `calculateSellerProceeds()`), dipakai bersama oleh jalur sinkron dan jalur rekonsiliasi supaya keduanya tidak bisa berbeda.

## ADR-025: AI Anomaly Detection Oracle untuk Trade
**Status**: Accepted
**Decision**: Deteksi pola wash-trading pada transaksi marketplace menggunakan pendekatan Oracle:
1. **Sinyal deterministik** (`fraud-signals.ts`): `repeatPairCount` (frekuensi pasangan wallet), `priceDeviationPct` (penyimpangan harga dari FVM), `resaleSpeedHours` (kecepatan resale).
2. **AI risk scoring** (`risk-score.ts`): **MiMo** (`MIMO_BASE_URL`, model `mimo-v2.5-pro`) mensintesis ketiga sinyal jadi skor 0-100. Threshold `flagged = riskScore >= 70`. Catatan: Gemini dipakai untuk Market Insight dan Price Suggestion (ADR-024), **bukan** untuk risk scoring — versi awal ADR ini keliru menyebut Gemini, dikoreksi 16 September 2026.
3. **On-chain Oracle** (`recordVerification()`): Hasil skor dan flag di-post ke smart contract, tercatat permanen di blockchain.
4. **FVM exclusion**: Transaksi dengan `flagged === true` dikecualikan dari perhitungan FVM untuk mencegah manipulasi harga.
5. **Non-blocking**: Semua scoring terjadi SETELAH transaksi selesai — tidak pernah memblokir atau membatalkan trade.
**Reason**: Wash-trading (A jual ke B, B jual balik ke A dengan harga naik) mengancam integritas FVM dan ekonomi marketplace. Oracle pattern memastikan hasil verifikasi transparan dan teraudit di on-chain, bukan hanya di database backend.

## ADR-026: Dismantle & Crystal — Burn-to-Earn Currency
**Status**: Accepted — direvisi 16 September 2026 agar sesuai implementasi
**Decision**: Kartu Digital dapat di-"dismantle" (burn permanen on-chain) untuk mendapatkan Crystal — currency baru yang TIDAK bisa dibeli maupun di-top-up dengan uang. Crystal hanya bisa didapat dari dismantle. Tidak ada transfer Crystal langsung antar-user; satu-satunya cara Crystal berpindah tangan adalah sebagai pembayaran pembelian di Marketplace (lihat blok "Crystal sebagai currency Marketplace" di bawah). Collection `crystal_balances` terpisah total dari `credits` supaya kedua currency tidak pernah tercampur. Kartu yang sudah di-burn berubah status jadi `"Burned"` di MongoDB (bukan dihapus) untuk menjaga provenance dan transparansi via Scan. Burned card tidak muncul di grid Collection aktif tetapi tetap bisa dicari by Card ID.
**Dismantle rates**: Common=20, Rare=50, Epic=120, Legendary=300 Crystal (proporsional ke rentang harga FVM).
**On-chain**: `burnCard(tokenId, owner)` memanggil OpenZeppelin `_burn()` yang menghancurkan token ERC1155 secara permanen. Hanya kartu Digital yang bisa di-burn — kartu Vaulted diblokir oleh `_update()` override yang sudah ada.
**Menggantikan konsep Buyback**: Dismantle & Crystal menggantikan rencana buyback — burn permanen on-chain, currency baru non-purchasable/non-cashable, tanpa liabilitas finansial.
**Crystal sebagai currency Marketplace (SUDAH DIBANGUN, bukan roadmap)**: Marketplace (ADR-024) memakai Crystal sebagai satu-satunya currency listing dan pembelian — bukan Credit.
- `POST /api/marketplace/listings` menolak harga di bawah floor 70% FVM (`getFVMFloor()` di `lib/fvm.ts`), dan pesan errornya menyebut satuan Crystal.
- `POST /api/marketplace/listings/[id]/buy` memanggil `deductCrystal(buyerId, price)` SEBELUM transfer on-chain, lalu me-refund via `addCrystal()` di setiap jalur gagal (listing keburu terjual ke orang lain, transfer on-chain gagal).
- Penjual dibayar `addCrystal(sellerId, round(price * (1 - 8/100)))` — fee marketplace 8% (`MARKETPLACE_FEE_PERCENT` di `buy/route.ts`) tidak pernah kembali ke sirkulasi, jadi setiap trade menyusutkan supply Crystal.
- Credit tetap khusus beli pack dan tidak punya jalur apa pun ke Marketplace (ADR-008).
**Riwayat revisi**: Versi awal ADR ini menandai Crystal-sebagai-currency-Marketplace sebagai "Roadmap (TIDAK dibangun di sesi ini)" padahal kodenya sudah berjalan. Penyimpangan ini ditemukan 16 September 2026 dan ADR direvisi agar kembali jadi sumber kebenaran.
**Supersedes**: kalimat roadmap tersebut, dan klaim di ADR-024 bahwa harga marketplace ditampilkan dalam Credit.
**Reason**: Burn on-chain membuktikan kartu benar-benar dihancurkan (transparan, teraudit di BSCScan). Crystal sebagai non-purchasable currency menghindari liabilitas finansial dan regulasi. Pemisahan collection mencegah bug cross-currency.
**Known limitation**: Setelah burn, `cardStatus(tokenId)` on-chain tetap menunjukkan nilai terakhir sebelum burn (tidak di-reset ke state "Burned") karena token ERC1155 sudah tidak ada setelah `_burn()`. Sumber kebenaran status "Burned" ada di MongoDB (`cards.status === "Burned"`). Perlu diingat kalau nanti ada fitur yang membaca `cardStatus` langsung dari chain tanpa cross-check MongoDB — perlu cek `balanceOf(owner, tokenId) == 0` sebagai indikator burn.
**Sudah pernah terpicu (16 September 2026)**: `api/scan` menerjemahkan status lewat array `STATUS_LABELS = ["Digital", "Vaulted"]` yang tidak mengenal `"Burned"`, sehingga kartu yang sudah di-dismantle tampil sebagai "Digital" dengan flag "warning" ("data mismatch") — padahal datanya konsisten. Pola masalahnya sama: status kartu diturunkan lewat perantara yang tidak mengenal state terminal, bukan dibaca langsung dari `cards.status`. Lihat ADR-028.

## ADR-027: Become a Creator — Whitelist Form untuk IP Owner
**Status**: Accepted
**Decision**: Halaman `/creators` menyediakan form whitelist untuk kolaborasi IP Owner eksternal. Fitur murni web2 (MongoDB collection `creator_applications`, tanpa blockchain). Form mengumpulkan: nama, brand/IP, tipe IP, social media, email, minat, estimasi community size. Honeypot field `website_url` untuk anti-spam bot (return 200 palsu tanpa insert). Admin tab "Creators" menampilkan semua submission. Revenue split 70/30 (creator/platform) sesuai model infrastruktur-first dari PRD.
**Reason**: Mengakuisisi IP Creator eksternal adalah growth vector utama Gachard. Form whitelist memungkinkan pipeline partner tanpa commitment teknis dari creator. Web2-only karena tidak ada kebutuhan blockchain untuk pendaftaran — blockchain hanya relevan setelah IP di-onboard dan kartu di-mint.

## ADR-028: Status Terminal Kartu — Klaim Atomik + Guard Anti-Timpa
**Status**: Accepted

**Decision** — dua lapis:

**Lapis 1 — guard anti-timpa (menutup bug yang terbukti terjadi).** Setiap penulisan status kartu dari proses rekonsiliasi/latar belakang WAJIB menyertakan `status: { $ne: "Burned" }` pada filter: `confirmTransaction()` (mint/print/redeem) di `lib/transactions.ts`, `confirmMint()` di `api/mint`, `api/admin/fix-pending-transactions`, `api/admin/fix-mint-cards`, `api/redeem`, dan `api/marketplace/listings/[id]/buy`. Rekonsiliasi hanya boleh memajukan kartu dari state sementara, tidak pernah menariknya keluar dari state terminal.

**Lapis 2 — klaim atomik sebelum menyentuh chain (pengerasan preventif).** Operasi yang memindahkan kartu ke status terminal mengklaim kartu lebih dulu lewat satu `findOneAndUpdate` yang memuat seluruh prasyarat di filter-nya, BUKAN pola cek-lalu-tulis. Di `api/dismantle`:

```js
const claimed = await cards.findOneAndUpdate(
  { cardId, ownerAddress, status: "Digital", isListed: { $ne: true },
    $or: [{ fulfillmentStatus: null }, { fulfillmentStatus: { $exists: false } }] },
  { $set: { status: "Burned", burnedAt, crystalReward } },
  { returnDocument: "after" }
);
if (!claimed) return 400;   // tidak memenuhi syarat — tidak ada yang berubah
```

Kalau langkah on-chain berikutnya gagal, klaim WAJIB dilepas kembali (`status` dikembalikan ke `"Digital"`).

**Masalah yang terbukti terjadi**: `GET /api/cards` menjalankan rekonsiliasi untuk setiap transaksi `pending` milik user setiap kali halaman Collection dibuka. Sebelum Lapis 1 ada, cabang `mint` menulis ulang kartu tanpa memeriksa status, sehingga konfirmasi mint yang datang belakangan **menghidupkan kembali kartu yang sudah di-dismantle** — kartu muncul lagi di Collection padahal token sudah di-burn on-chain dan Crystal sudah dibayarkan.

Bukti terukur dari database (16 September 2026), kartu `#b73ab`:

```
burnedAt = 02:02:51.544        <- dismantle menulis "Burned"
lastSync = 02:02:51.667        <- 123 ms kemudian, konfirmasi mint menimpanya jadi "Digital"
```

Total 6 kartu rusak dari 168 transaksi dismantle. **Seluruh 6 kartu itu di-dismantle sebelum Lapis 1 ter-deploy** — dengan guard yang sekarang, penulisan penimpa itu akan tertolak. Jadi Lapis 1 sudah cukup untuk kasus ini.

**Kenapa Lapis 2 tetap dipasang, padahal Lapis 1 sudah cukup**: `api/dismantle` versi lama membaca status kartu, lalu memanggil `burnCard()` (submit blockchain, ratusan milidetik sampai beberapa detik), baru menulis `"Burned"`. Jendela cek-lalu-tulis selebar itu adalah balapan yang nyata secara struktural, meski belum pernah terbukti terpicu. Klaim atomik menutupnya, dan sebagai efek samping membuat dismantle ganda pada kartu yang sama mustahil — hanya satu klaim yang bisa cocok dengan `status: "Digital"`. Ini pengerasan preventif, bukan perbaikan atas kegagalan yang teramati.

**Konsekuensi**:
- Transaksi dismantle mencatat `cardId`, supaya perbaikan data mencocokkan secara eksak dan tidak menebak lewat tokenId.
- `api/admin/fix-burned-card` mencocokkan lewat `cardId`; untuk transaksi lama yang hanya punya tokenId, pencocokan di-scope dengan `contractAddress`, dan yang ambigu dilewati.
- `tokenId` **tidak unik lintas kontrak** — kontrak sudah di-deploy ulang beberapa kali dan penomoran mulai dari 1 lagi. Penulisan yang match by `{ tokenId }` saja berbahaya.
- `api/admin/fix-claimed-cards` diperiksa dan aman: `status: "Digital"` di sana hanya filter `.find()`, dan `status: "claimed"` menulis ke koleksi `redeem_codes`, bukan `cards`.
- Endpoint seeding (`api/seed-marketplace`, `api/seed-onchain`) sengaja TIDAK di-guard, karena tugasnya memang menata ulang data demo.
- Kalau nanti ada status terminal baru (mis. kartu hangus/expired), kedua lapis harus ikut diperluas.

**Reason**: Kegagalan ini muncul dua kali. Pertama 1 September 2026, ditambal endpoint perbaikan (`8152d8a`, `3904fae`) tanpa akar masalah dicari, sehingga terulang. Kedua 16 September 2026, akar masalahnya ditemukan dan dikunci di ADR ini.

**Catatan metode (16 September 2026)**: saat 6 kartu rusak itu dilaporkan, sempat disimpulkan bahwa guard "tidak cukup" dan ada balapan tulis yang masih hidup. Kesimpulan itu **salah** — dibangun dari asumsi bahwa kartu-kartu tersebut di-dismantle setelah guard ter-deploy, tanpa memverifikasi timestamp-nya lebih dulu. Setelah dicek, dismantle terjadi 14 menit sebelum guard di-commit. Pelajaran: bandingkan timestamp data dengan waktu deploy SEBELUM menyimpulkan sebuah perbaikan gagal.

## ADR-030: Seluruh Komponen AI Dimatikan lewat Flag `ENABLE_AI`
**Status**: Accepted — 21 September 2026
**Decision**: Seluruh komponen AI dinonaktifkan dan hanya menyala kalau environment variable `ENABLE_AI` bernilai persis `"true"`. Default-nya **mati**. Switch-nya ada di `lib/ai-flags.ts` (`isAIEnabled()`), dipakai di tiga titik:
- `POST /api/marketplace/listings/[id]/buy` — blok `after()` yang menjalankan `calculateTradeSignals()`, `calculateRiskScore()`, dan `recordVerification()` dilewati seluruhnya (mematikan ADR-025 secara operasional).
- `GET /api/marketplace/insight` — membalas `200 { insight: null, disabled: true }`, bukan 500.
- `GET /api/marketplace/suggest` — membalas `200 { suggestion: null, disabled: true }`.
**Konsekuensi yang disengaja**: trade tetap berjalan penuh, hanya tanpa skor. Tidak ada transaksi yang di-flag, jadi **seluruh trade ikut dihitung dalam FVM** dan perlindungan anti wash-trading di ADR-025 tidak aktif. Tidak ada penulisan ke oracle on-chain. UI menyembunyikan panel insight dan saran harga sendiri karena keduanya sudah menangani nilai null.
**Reason**: Keputusan produk pemilik project. Balasan 200 dipilih daripada 500 supaya fitur yang dimatikan tidak terlihat seperti fitur rusak.
**Catatan penting**: ADR-024 dan ADR-025 **tidak dicabut**. Kode AI-nya tetap utuh di repo dan bisa dihidupkan kembali hanya dengan menyetel `ENABLE_AI=true`, tanpa deploy ulang kode. ADR ini mengatur status operasional, bukan menghapus keputusan arsitekturnya.
**Risiko yang sudah disampaikan ke pemilik project**: "AI x Web3" adalah tema wajib di semua track Indonesia Web3 Hackathon 2026. Dengan flag mati, submission tidak memiliki komponen AI yang berjalan.

## ADR-029: Tool Development — Pindah dari MiMoCode ke Claude Code
**Status**: Accepted — melanjutkan ADR-015
**Decision**: Sejak September 2026 development dilanjutkan memakai **Claude Code**, bukan MiMoCode. `CLAUDE.md` di root menjadi adapter instruksi yang aktif; `MEMORY.md` dan `DECISIONS.md` tetap jadi dokumen inti yang tool-agnostic dan wajib dibaca di awal sesi.
**Reason**: ADR-014 memang merancang dokumentasi ini supaya tool-agnostic dengan adapter per tool, jadi perpindahan tool tidak menuntut perubahan dokumen inti — hanya adapter-nya yang berganti.
**Konsekuensi**:
- `.mimo/config.md` dan `.mimocode/` menjadi artefak historis, bukan konfigurasi aktif.
- ADR-016 (soal file mana yang auto-load di MiMoCode) tetap berlaku sebagai catatan sejarah, tapi tidak lagi menggambarkan setup yang berjalan.
