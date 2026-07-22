# Execution Plan — Gachard
**Pendamping PRD-Gachard-Hackathon.md — disusun 20 Juli 2026**

Rencana ini menyinkronkan build order (dari PRD §10) dengan jadwal workshop resmi yang sudah dikonfirmasi dari halaman event. Setiap minggu punya target build + sesi workshop terkait + checkpoint credit budget.

---

## Ringkasan Jadwal Workshop (Terkonfirmasi)

| Sesi | Tanggal | Topik |
|---|---|---|
| 1 | 5 Jul 2026 (sudah lewat) | Foundations 1: Environment + First Deploy |
| 2 | 12 Jul 2026 (sudah lewat) | Foundations 2: Solidity via Guestbook |
| 3 | 19 Jul 2026 (sudah lewat) | Smart Contract 1: Foundry + Token + Bounty Board |
| 4 | 26 Jul 2026 | Smart Contract 2: Full Bounty + Security |
| 5 | 2 Agu 2026 | Backend 1: Reading the Chain + Indexing |
| 6 | 9 Agu 2026 | Backend 2: API + AI Auto-verify |
| 7 | 16 Agu 2026 | Frontend: dApp UI |
| 8 | 25 Agu 2026 (Selasa) | AI Integration (Patterns) + Scope Ideas |
| 9 | 30 Agu 2026 | Pitch Training untuk Demo Day |

**Catatan**: tanggal Demo Day sesungguhnya (setelah Sesi 9) belum diumumkan — ini masih open question dari PRD §13. Perbarui rencana ini begitu tanggalnya dikonfirmasi panitia.

---

## Minggu 1 — 20–26 Juli (menuju Sesi 4)

**Tujuan**: setup fondasi + scaffold aplikasi dasar.

- [ ] Buat akun Emergent, sambungkan ke GitHub
- [ ] Siapkan wallet testnet + claim faucet BNB testnet/opBNB
- [ ] **Prompt 1 ke Emergent**: scaffold aplikasi dasar — login Google OAuth (mock wallet custodial di backend), struktur UI kosong untuk Home/Koleksi/Profil
- [ ] Review PRD sekali lagi, pastikan tidak ada keputusan yang berubah pikiran
- [ ] Hadiri Sesi 4 (Security) — bawa scaffold awal untuk ditanyakan ke mentor bila sempat

**Checkpoint credit**: pastikan belum banyak terpakai — tahap ini seharusnya murah karena baru scaffolding dasar.

---

## Minggu 2 — 27 Jul–2 Agustus (menuju Sesi 5)

**Tujuan**: core mint function jalan di testnet. *(Bagian yang tidak boleh gagal — prioritas nomor satu di PRD §10.)*

- [ ] **Prompt 2**: buat smart contract BEP-1155 untuk mint kartu (status default `Digital`)
- [ ] Test mint di testnet BNB — pastikan token muncul dan bisa dilihat di block explorer
- [ ] Minta Emergent jelaskan kode yang dihasilkan (per rekomendasi sebelumnya) — pastikan Anda paham logikanya
- [ ] Commit ke GitHub setelah mint berfungsi stabil
- [ ] Hadiri Sesi 5 (Reading the Chain + Indexing) — relevan langsung untuk cara membaca status NFT dari chain ke UI

**Checkpoint credit**: evaluasi apakah pace pemakaian credit sesuai estimasi (§12 PRD: 20–25 jam dialokasikan untuk seluruh core logic, ini baru sebagian).

---

## Minggu 3 — 3–9 Agustus (menuju Sesi 6)

**Tujuan**: vault/print/redeem state machine — bagian paling kritis dari keseluruhan produk.

- [ ] **Prompt 3**: implementasi `requestPrint()` (generate kode+hash baru, overwrite hash lama, status → `Vaulted`, transfer ke alamat vault)
- [ ] **Prompt 4**: implementasi `redeemCard()` (cek status + hash, transfer ke `recipientAddress`, backend rate-limiting)
- [ ] Test end-to-end di testnet: mint → requestPrint → redeem, ulangi 2–3 siklus pada token yang sama untuk pastikan hash lama benar-benar invalid
- [ ] **Mulai pesan/cetak kartu fisik** (printer sendiri + kertas foto + stiker scratch-off) — jangan tunda ke minggu terakhir
- [ ] Hadiri Sesi 6 (API + AI Auto-verify) — bawa pertanyaan spesifik soal rate-limiting dan verifikasi otomatis, sangat relevan untuk fitur ini

**Checkpoint credit**: ini kemungkinan minggu paling boros credit karena logika paling kompleks — sisihkan buffer, jangan mulai fitur lain dulu sebelum ini stabil.

---

## Minggu 4 — 10–16 Agustus (menuju Sesi 7)

**Tujuan**: sistem credit (top-up) + UI utama.

- [ ] **Prompt 5**: sistem credit — `creditBalance` di database, `topUpCredits()` via Stripe test-mode Playbook, `buyPack()` potong saldo credit
- [ ] **Prompt 6**: pembayaran langsung terpisah untuk `requestPrint()` (Stripe test-mode, bukan credit)
- [ ] **Prompt 7**: bangun UI utama (Home, Buy Pack, Reveal animation, Koleksi, Request Print flow)
- [ ] Tambahkan placeholder "Coming Soon" untuk Marketplace (§9 PRD — cukup 1–2 jam kerja)
- [ ] Hadiri Sesi 7 (Frontend: dApp UI) — selaraskan pola UI yang diajarkan dengan yang sudah dibangun

**Checkpoint credit**: bandingkan sisa credit vs sisa fitur (AI scan belum dibangun) — kalau menipis, ini titik keputusan untuk memangkas sesuai urutan prioritas §10.

---

## Minggu 5 — 17–25 Agustus (menuju Sesi 8)

**Tujuan**: fitur AI scan — wajib untuk tema hackathon, fokus terakhir sebelum polish.

- [ ] **Prompt 8**: QR/kode lookup dari kartu ke `tokenId`
- [ ] **Prompt 9**: integrasi AI vision (API vision model siap pakai, bukan training sendiri) untuk analisis gambar kartu
- [ ] Tampilkan output: rarity, harga terakhir, status vault, riwayat kepemilikan, flag verifikasi (✅/⚠️)
- [ ] Test scan pakai kartu fisik yang sudah dicetak di Minggu 3
- [ ] Hadiri Sesi 8 (AI Integration Patterns + Scope Ideas) — sesi ini kemungkinan paling relevan untuk mempertajam fitur AI-scan sebelum finalisasi

**Checkpoint credit**: fitur droppable terakhir kalau waktu benar-benar habis adalah elemen AI vision (fallback ke QR lookup polos, per §10 PRD).

---

## Minggu 6 — 26–30 Agustus (menuju Sesi 9)

**Tujuan**: stabilisasi, bukan fitur baru.

- [ ] **Tidak ada prompt fitur baru** — hanya bug fixing dari apa yang sudah dibangun
- [ ] Minta mentor review khusus logika vault/redeem (hash-overwrite + rate-limiting) — bawa pertanyaan spesifik
- [ ] Mulai susun draft pitch deck (problem, solution, demo flow, arsitektur, roadmap, ask) — gunakan PRD sebagai bahan mentah
- [ ] Rekam video backup satu siklus redeem yang berhasil sempurna
- [ ] Hadiri Sesi 9 (Pitch Training)

---

## Sisa Waktu Setelah Sesi 9 hingga Demo Day (tanggal TBD)

- [ ] Rehearsal end-to-end minimal 3–4 hari sebelum Demo Day
- [ ] Cek syarat submission resmi begitu diumumkan (repo GitHub publik, video demo, alamat contract testnet) — lihat PRD §13/§24–25
- [ ] Deploy final contract address, catat di submission untuk verifikasi juri di block explorer
- [ ] Uji environment demo (laptop, kamera, koneksi/hotspot backup) idealnya H-1 di lokasi

---

## Prinsip Kerja Selama 6 Minggu Ini

1. **Satu prompt = satu fitur scoped**, jangan gabung beberapa fitur besar dalam satu prompt.
2. **Test on-chain segera** setelah setiap fitur inti dibangun — jangan batch di akhir.
3. **Commit ke GitHub** setiap kali sesuatu stabil, bukan hanya di akhir hari.
4. **Cek §10 PRD (urutan prioritas potong)** setiap kali credit terasa boros — putuskan potong berdasarkan itu, bukan dadakan.
5. **Update PRD** setiap kali ada keputusan baru saat build (dokumen hidup, bukan statis).
