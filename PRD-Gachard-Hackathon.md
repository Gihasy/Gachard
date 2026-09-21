# Product Requirements Document (PRD)
# Gachard — Digital-to-Physical TCG Platform

**Versi:** Draft 1.0 — untuk submission Indonesia Web3 Hackathon 2026
**Track:** Consumer Apps (dengan elemen AI Agent pada fitur scan)
**Tim:** Solo developer (non-programmer, menggunakan vibe coding via Emergent.sh)
**Chain:** BNB Chain Testnet / opBNB Testnet
**Timeline:** ~5 minggu, ~14 jam/minggu (±70 jam total)

---

## 0. Amendments (per 21 September 2026)

PRD ini adalah **dokumen historis "Draft 1.0"** dan sengaja tidak ditulis ulang. Beberapa
keputusan di dalamnya sudah berubah sejak ditulis. Kalau isi PRD bertentangan dengan
`DECISIONS.md`, **`DECISIONS.md` yang berlaku.**

| Bagian PRD | Isi PRD | Keadaan sekarang |
|---|---|---|
| Header "Tim" | "vibe coding via Emergent.sh" | Emergent tidak pernah dipakai sama sekali. Sprint 1–6 dikerjakan dengan MiMoCode (ADR-015); sejak September 2026 dilanjutkan dengan Claude Code (ADR-029). |
| §4, §9, §10 | Marketplace = UI placeholder "Coming Soon", di luar scope | Marketplace **fungsional**: listing, buy, cancel, FVM pricing, fee 8%, AI price suggestion (ADR-024, menggantikan ADR-010). |
| Scope umum | — | Fitur yang belum ada saat PRD ditulis dan kini sudah dibangun: Dismantle & Crystal (ADR-026), AI Anomaly Detection Oracle (ADR-025), Become a Creator (ADR-027). |
| Pack | "1 kartu per pembelian" | Dua tipe pack: Standard 5 kartu/500 Credit, Booster 10 kartu/800 Credit (ADR-021). |
| AI scan | AI vision sebagai elemen AI utama | AI vision **ditunda** (ADR-022) dan tidak dipanggil dari endpoint mana pun. Verifikasi kartu memakai QR lookup on-chain vs database. |
| Elemen AI | AI sebagai elemen wajib track | Seluruh komponen AI **dimatikan** lewat flag `ENABLE_AI` sejak 21 September 2026 (ADR-030): risk scoring anomaly detection (MiMo) dan market insight + price suggestion (Gemini). Kodenya tetap ada dan bisa dihidupkan kembali tanpa deploy ulang. |
| Pembayaran | Stripe untuk credit dan biaya cetak | Stripe **tidak pernah diintegrasikan**. Top up credit menulis saldo langsung ke database dan print checkout mencatat `sim_<timestamp>`, jadi seluruh pembayaran disimulasikan. Pemisahan dua jalurnya (ADR-008) tetap berlaku di level desain. |
| Status label | "Real" | Label user-facing sekarang "Physical". Nilai di database tetap `"Real"` (tanpa migrasi data). |

Selebihnya — latar belakang masalah, differentiator, model bisnis, dan alur domain inti
(mint → vault → print → redeem) — masih berlaku sebagaimana ditulis.

---

## 1. Latar Belakang & Masalah

Kolektor kartu fisik (TCG, sports card, dsb) menghadapi dua masalah utama:

1. **Grading otentikasi mahal dan tidak pasti hasilnya** — layanan seperti PSA membutuhkan biaya besar, waktu tunggu lama, dan hasil grade tidak terjamin sepadan dengan biaya yang dikeluarkan.
2. **Kartu digital tidak punya bukti keaslian dan kepemilikan yang terverifikasi** — sulit dibuktikan otentik, sulit ditelusuri riwayat kepemilikannya, dan sulit diperdagangkan dengan aman.

Sementara itu, platform Web3/NFT yang sudah ada untuk kartu koleksi (contoh: Courtyard.io) berfokus pada **tokenisasi kartu fisik yang sudah ada** — bukan menciptakan kartu digital-native sejak awal untuk brand/IP baru.

## 2. Solusi & Diferensiator

**Gachard** adalah platform di mana brand/IP (via licensee atau invite) dapat menerbitkan kartu TCG digital-native (Battle Card / Collection Card). User membeli card pack, reveal kartu, dan kartu tersebut tercatat sebagai NFT untuk membuktikan keaslian dan kepemilikan.

**Kalimat diferensiator:**
> *"Berbeda dengan platform seperti Courtyard yang men-tokenisasi kartu fisik yang sudah ada, Gachard menciptakan kartu digital-native sejak lahir — dan kartu itu bisa berpindah bolak-balik antara bentuk digital dan fisik tanpa kehilangan riwayat keasliannya, karena kartu fisik yang di-redeem kembali ke digital akan dirusak permanen sehingga nilai hanya ada di satu bentuk pada satu waktu."*

**Prinsip desain utama:** seluruh mekanisme blockchain **disembunyikan dari end-user**. User berinteraksi seperti aplikasi konsumen biasa (login Gmail, username, "beli", "buka pack") tanpa perlu tahu istilah wallet, gas fee, atau NFT.

## 3. Target Track & Framing Juri

- **Track utama:** Consumer Apps — sesuai brief track yang menekankan AI untuk menyederhanakan adopsi Web3 dan mengurangi kompleksitas blockchain bagi end-user.
- **Elemen AI Agent:** fitur AI-scan diposisikan bukan sekadar lookup data, tapi mengandung elemen keputusan otomatis (verifikasi/flag anomali), untuk memperkuat narasi lintas-track.
- **Prioritas penilaian yang disasar:** inovasi teknis dan kualitas eksekusi demo (bukan kelengkapan bisnis/legal — itu disebut singkat saja di roadmap, tidak jadi fokus effort).

## 4. User Flow (Demo Scope)

1. **Login** — user daftar/masuk via Google OAuth, membuat username `@user`. Wallet dibuat otomatis di backend, tersembunyi total dari user.
2. **Top Up Credit** — user top up saldo credit dengan nominal bebas (dalam batas min/maks) lewat Stripe Test Mode, satu kali per top-up. Saldo tersimpan di database backend (bukan on-chain).
3. **Buy Pack** — user "membeli" pack menggunakan saldo credit (bukan Stripe berulang) — cukup pengurangan saldo di backend.
4. **Reveal** — pack dibuka, kartu (artwork AI-generate yang sudah disiapkan sebelumnya) muncul dengan rarity sesuai distribusi odds yang bisa diatur di backend.
5. **Koleksi** — user melihat koleksi kartunya, masing-masing berstatus `Digital`.
6. **Marketplace — "Coming Soon"** — ditampilkan di UI sebagai placeholder/badge "Coming Soon", tidak difungsikan untuk demo. *(Lihat §9 dan §10.)*
7. **Request Print** — user memilih kartu, klik "Request Print" → **pembayaran real terpisah via Stripe Test Mode (bukan credit)** → status berubah ke `Vaulted`, NFT berpindah ke alamat vault Gachard, transfer normal ditolak selama status ini.
8. **Terima Kartu Fisik (simulasi demo)** — kartu fisik dicetak sebelumnya (printer + kertas foto), berisi QR/kode redeem tertutup stiker scratch-off.
9. **Redeem Kembali ke Digital** — siapa pun yang punya kode yang sah bisa memanggil fungsi redeem (seperti coupon code), kartu fisik "dirusak" (digosok/disobek), NFT berpindah dari vault ke wallet pemanggil, status kembali `Digital`.
10. **AI Scan** — user memindai kartu (fisik via kamera atau digital di layar) → sistem membaca QR untuk `tokenId`, lalu AI vision menganalisis gambar dan menampilkan: rarity, harga terakhir, status vault, ringkasan riwayat kepemilikan, dan flag verifikasi (✅/⚠️).

## 5. Arsitektur Teknis (Ringkas)

### 5.0 Delivery Platform
- **PWA (Progressive Web App)**, bukan native app terpisah — manifest.json + service worker di atas stack React/Next.js.
- Menghindari proses App Store review yang berisiko terhambat kebijakan Apple soal NFT/digital collectibles. Satu codebase untuk semua platform, sesuai timeline hackathon.
- Kamera (untuk AI-scan) dan Stripe checkout tetap berfungsi normal di konteks web/PWA.
- Known limitation: push notification di iOS PWA lebih terbatas dibanding native app — dicatat untuk pertimbangan produksi, tidak relevan untuk demo hackathon.

### 5.1 Wallet & Identitas
- **Custodial wallet**: dibuat otomatis oleh backend saat user daftar via Google OAuth. Private key disimpan aman di server, tidak pernah diserahkan ke user.
- User hanya mengenal identitas sebagai username `@user`, tidak pernah melihat wallet address.

### 5.2 Gas Fee
- **Sponsored oleh platform Gachard.** Semua transaksi dieksekusi backend (sebagai pemanggil kontrak) atas nama user, bukan langsung dari wallet user.
- Catatan roadmap (disebut di pitch, tidak perlu diselesaikan untuk demo): ini titik sentralisasi (single admin key) — versi produksi nyata perlu pertimbangan keamanan tambahan (multi-sig / custodian pihak ketiga).

### 5.3 Token Standard
- **BEP-1155** untuk saat ini (kartu sama = fungible per rarity). Terbuka untuk migrasi ke kombinasi dengan BEP-721 jika project berlanjut pasca-hackathon (untuk kartu yang butuh keunikan individual, mis. edisi legendary bernomor).

### 5.4 State Machine per Kartu
```
Digital  →  (requestPrint)  →  Vaulted  →  (redeemCard + kode valid)  →  Digital (pemilik baru)
```
- Transfer standar **ditolak** selama status = `Vaulted`.
- Kartu berstatus `Vaulted` **tidak bisa** di-list di marketplace.

### 5.5 Fungsi Kontrak Inti
- `mintCard()` — mint awal saat pack dibuka, status default `Digital`.
- `requestPrint(tokenId, newHash)` — dipanggil pemilik saat ini (via backend). Backend generate kode acak **baru** setiap kali fungsi ini dipanggil (baik pertama kali maupun siklus print ke-N), lalu kirim `hash(kode-baru)` sebagai parameter. Kontrak **menimpa (overwrite)** `storedHash[tokenId]` yang lama dengan `newHash`, ubah status ke `Vaulted`, transfer ke alamat vault, catat `lastOwner`. Kode plaintext **tidak pernah** ditampilkan ke user di aplikasi atau masuk on-chain — hanya diteruskan ke jalur cetak fisik.
- `redeemCard(tokenId, code)` — bersifat publik (siapa pun dengan kode benar bisa memanggil, seperti coupon code). Cek: (1) status kartu = `Vaulted`, (2) `hash(code) == storedHash[tokenId]` → transfer dari vault ke `msg.sender` (via backend atas nama user), ubah status ke `Digital`, catat `lastOwner` baru. Urutan cek-status → cek-hash → transfer dalam satu transaksi otomatis menghindari race condition karena sifat sekuensial blockchain. Karena hash ditimpa setiap siklus print, kode dari siklus print sebelumnya otomatis tidak valid lagi tanpa perlu daftar "used code" terpisah.
- Override fungsi transfer bawaan BEP-1155 untuk menghormati status `Vaulted`.
- Event log setiap perubahan status untuk riwayat kepemilikan (`lastOwner`, `timestamp`, `lastPrice`).

### 5.6 Redeem Code
- Kode acak 12+ karakter alfanumerik, di-generate backend, disimpan sebagai **hash** (bukan plaintext) di kontrak — satu hash aktif per `tokenId` (bukan riwayat semua kode).
- Setiap kali kartu di-request-print ulang (siklus ke-2, ke-3, dst.), kode **baru** dibuat dan hash lama **ditimpa** — kode fisik lama otomatis kedaluwarsa selamanya meski kartu fisik lama secara fisik masih ada dan belum digosok.
- Kode plaintext hanya ada di dua tempat: memori sementara backend saat proses cetak, dan kartu fisik itu sendiri (di balik stiker scratch-off). Tidak pernah disimpan plaintext di database permanen maupun ditampilkan di UI.
- **Jalur akses redeem dikunci lewat backend, bukan on-chain bebas.** Meski fungsi kontrak `redeemCard` secara teknis publik, user hanya bisa mengakses redeem lewat form aplikasi (login → input kode). Backend menerapkan rate-limiting (mis. maksimal 5 percobaan per menit per akun) sebelum meneruskan transaksi on-chain — mencegah penyalahgunaan gas fee yang disponsori platform untuk brute-force tebak kode.

### 5.7 Rarity & Odds
- Distribusi odds (mis. 70% common / 20% rare / 8% epic / 2% legendary) disimpan di **backend/database**, bukan hardcoded on-chain — supaya bisa diubah-ubah selama testing tanpa redeploy kontrak. Hanya hasil akhir reveal yang tercatat on-chain.

### 5.8 Known Limitations & Catatan Produksi (Bukan Untuk Hackathon, Jangan Dikerjakan Sekarang)

Celah berikut disadari sejak fase ini, tapi sengaja **tidak diselesaikan untuk demo hackathon** — dicatat di sini supaya tidak terlupakan jika project berlanjut ke tahap serius/produksi:

- **Keamanan fisik stiker scratch-off** — demo mengandalkan integritas stiker biasa, bukan segel tamper-proof setara PSA. Perlu solusi anti-counterfeit yang lebih kuat di tahap produksi.
- **⚠️ Privasi riwayat kepemilikan** — saat ini AI-scan menampilkan username pemilik sebelumnya ke siapa pun yang scan kartu. **Jika project berlanjut ke tahap produksi/serius, ini wajib ditinjau ulang** — pertimbangkan opsi anonymize/hash username di riwayat yang tampil publik, sesuai kebutuhan privasi user.
- **Kepercayaan pada proses cetak-dan-segel** — untuk demo, Anda sendiri yang menangani kode sebelum ditutup stiker (solo, jadi rendah risiko). **Untuk tahap produksi, rencana kerja sama dengan Millennium Print Group (MPG)** sebagai mitra cetak-dan-segel — perlu dipastikan proses mereka tidak melibatkan manusia yang melihat kode plaintext sebelum kartu tersegel (idealnya kode digenerate dan dicetak otomatis oleh sistem mereka, bukan dikirim manual dalam bentuk plaintext ke operator).

## 6. Fitur AI

- **QR/kode lookup** — identifikasi presisi `tokenId` dari kartu (fisik maupun digital).
- **AI vision** — analisis gambar kartu menggunakan API vision model yang sudah ada (bukan training model sendiri), untuk: kecocokan artwork dengan metadata, deteksi anomali, estimasi kondisi fisik.
- **Output ke user**: rarity, harga terakhir, status vault, ringkasan riwayat kepemilikan, flag verifikasi otomatis (elemen "keputusan" untuk narasi AI Agent).

## 7. Aset Kartu (Konten)

- Artwork **AI-generate, disiapkan manual di awal** (bukan generate-on-demand saat reveal) untuk keandalan demo.
- Gaya visual dibuat konsisten antar kartu dalam satu set (satu IP dummy, 5–10 kartu).

## 8. Payment (Demo Scope)

- **Tidak ada crypto yang terlihat oleh user.**
- **Model dua jalur:**
  - **Credit (virtual, untuk beli pack)** — user top up credit dengan nominal bebas (dibatasi min/maks untuk validasi sederhana) lewat **Stripe Test Mode** satu kali. Saldo credit disimpan sebagai field `creditBalance` **murni di database backend, bukan token on-chain**. Beli pack cukup mengurangi saldo credit — tidak ada panggilan Stripe berulang per pembelian.
  - **Pembayaran langsung (real, untuk request print)** — request print **wajib** pakai Stripe Test Mode terpisah setiap kali, **tidak bisa memakai credit** — karena ada biaya nyata (cetak + kirim) yang secara sengaja dipisahkan dari ekonomi virtual pack.
- Gunakan integer dalam satuan terkecil (sen/cent) untuk saldo credit, hindari tipe desimal/float untuk mencegah masalah pembulatan.
- Playbook Stripe bawaan Emergent bisa dipakai untuk kedua jalur (top-up dan print payment) tanpa effort besar tambahan.

## 9. Scope IN vs OUT

### IN (dibangun untuk demo)
- Login Google OAuth + custodial wallet otomatis
- Mint pack → reveal kartu (BEP-1155)
- Request print → status Vaulted
- Redeem code → kartu kembali ke Digital
- AI scan (QR + vision)
- Stripe test-mode checkout (simulasi)
- Kartu fisik cetak sendiri + stiker scratch-off untuk demo
- Marketplace ditampilkan sebagai **UI placeholder "Coming Soon"** (bukan fungsional) — cukup untuk menunjukkan visi produk lengkap tanpa menghabiskan waktu development

### OUT (future feature / roadmap, tidak dibangun untuk hackathon)
- **Marketplace fungsional** (trading, listing, order-book/bidding) — ditandai sebagai "Coming Soon" di produk, akan dibangun pasca-hackathon
- Payment gateway produksi sungguhan (Apple Pay/Google Pay/kartu asli)
- Grading fisik bersegel setara PSA
- Multi-brand licensing sungguhan
- Kepatuhan regulasi penuh (gambling law, securities law) — disebut sebagai kesadaran roadmap, bukan dikerjakan

## 10. Prioritas Fitur Jika Waktu Mepet

Marketplace sudah otomatis di luar scope development (lihat §9) sehingga tidak lagi masuk daftar potong. Urutan **paling aman dipotong lebih dulu** jika minggu ke-4 waktu tidak cukup:

1. Polish UI/UX tambahan
2. AI vision (fallback ke QR lookup saja + tampilkan data tanpa elemen vision)
3. *(Tidak boleh dipotong)* Core loop: mint–vault–redeem

## 11. Rencana Demo & Cadangan

- Rehearsal end-to-end minimal 3–4 hari sebelum Demo Day.
- **Video backup** dari satu kali proses redeem yang berhasil sempurna, disiapkan jauh-jauh hari, untuk jaga-jaga jika demo live gagal (masalah koneksi venue, dll).
- Hotspot HP sebagai cadangan internet.
- Kartu fisik + stiker scratch-off disiapkan minggu ke-2/ke-3 (bukan minggu terakhir).

## 12. Timeline & Alokasi Jam (± 70 jam total)

| Area | Estimasi Jam |
|---|---|
| Core mint–vault–redeem logic | 20–25 jam |
| AI scan (QR + vision) | 15–20 jam |
| Marketplace (UI placeholder "Coming Soon" saja) | 1–2 jam |
| UI/UX | 10 jam |
| Pitch deck & rehearsal demo | 10 jam |
| Buffer bug/debug tak terduga | 13–18 jam |

## 13. Open Questions (Menunggu Info Eksternal)

- Syarat submission resmi hackathon (format repo, video demo, deployed contract address, dll) — **belum ada informasi, perlu dicek ke grup peserta/panitia segera.**
- Apakah smart contract wajib deploy dengan alamat dicantumkan di submission untuk verifikasi juri di block explorer.

## 14. Track Confirmation

Dikonfirmasi: track **Consumer Apps** tetap mewajibkan elemen AI (brief track & tema hackathon "AI x Web3" berlaku di semua track) — fitur AI-scan yang sudah direncanakan memenuhi syarat ini tanpa tambahan.

---
*Dokumen ini adalah working draft — direvisi seiring keputusan baru selama development.*
