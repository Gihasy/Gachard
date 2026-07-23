# Guideline Artwork Kartu — Gachard

## 1. Ukuran & Format

| Spek | Nilai | Alasan |
|---|---|---|
| Ukuran fisik | 63mm × 88mm (2.5" × 3.5") | Standar industri TCG (sama seperti Pokémon/MTG/Yugioh) — kertas foto dan sleeve pelindung yang dijual di pasaran mengikuti ukuran ini |
| Aspect ratio | 5:7 (0.714) | Turunan dari ukuran di atas — pastikan kanvas digital memakai rasio ini sejak awal |
| Resolusi digital | Minimal 1500×2100 px (300 DPI di ukuran 5"×7", diskalakan turun) | Cukup tinggi untuk cetak tajam DAN bisa di-downscale untuk tampilan di app tanpa pecah |
| Format file | PNG | Kualitas tanpa loss, mendukung Anda kalau perlu elemen transparan nanti |
| Color space | sRGB | Standar universal, aman untuk cetak rumahan maupun tampilan layar |

## 2. Rarity & Jumlah

Sesuai `card_templates` yang sudah di-seed di MongoDB (Sprint 2) — **8 kartu, 2 per rarity**:

| Rarity | Enum (kontrak) | Jumlah | Treatment Visual yang Disarankan |
|---|---|---|---|
| Common | 0 | 2 | Warna flat/muted, border tipis, tanpa efek khusus |
| Rare | 1 | 2 | Aksen warna biru pada border, sedikit glow |
| Epic | 2 | 2 | Aksen warna ungu pada border, glow lebih kuat |
| Legendary | 3 | 2 | Border gradien holografik penuh (ungu-pink-biru-kuning, samakan dengan gradien logo Gachard), efek foil/shine |

**Kenapa treatment ini penting**: pola "rarity tinggi = makin holografik" adalah bahasa visual yang sudah dikenali komunitas TCG global — Legendary yang terlihat seperti foil kartu langka akan langsung dikenali sebagai "kartu bagus" tanpa perlu teks penjelasan, cocok untuk demo yang cepat dan visual.

## 3. Elemen Wajib per Kartu (Sisi Depan)

Susun kanvas dengan safe margin (jangan taruh elemen penting terlalu mepet ke tepi — UI app nanti mungkin overlay badge rarity/harga di atas gambar):

1. **Nama kartu** — area teks di bagian atas atau bawah
2. **Ilustrasi utama** — area terbesar, isi karya AI-generate
3. **Border/frame** — sesuai kode warna rarity di atas
4. **Rarity icon kecil** — simbol/ikon di pojok, membantu identifikasi cepat tanpa baca teks
5. **Logo Gachard kecil** — pojok bawah, branding konsisten

## 4. Sisi Belakang (Card Back) — Cukup SATU Desain untuk Semua 8 Kartu

Jangan buat card back terpisah per kartu — cukup **satu desain generik** bertema logo/brand Gachard, dipakai untuk semua 8 kartu. Ini menghemat pekerjaan signifikan.

**Elemen wajib di card back:**

1. Logo Gachard (dominan, di tengah)

2. **QR Info-Scan** (SELALU terlihat, TIDAK ditutup scratch-off):
   - Area kecil (~1.5cm×1.5cm), posisi di pojok atas atau bawah
   - Berisi URL `/scan?tokenId=...` — siapa saja bisa scan untuk lihat info kartu
   - QR ini bersifat publik, bukan rahasia
   - Cetak langsung sebagai bagian dari desain card back

3. **Area Redeem Code** (DITUTUP stiker scratch-off):
   - Area terpisah (~2cm×2cm), posisi berbeda dari QR info-scan
   - Berisi kode redeem rahasia (12+ karakter) + QR code redeem
   - Area ini yang nantinya ditutup stiker scratch-off
   - Kode hanya terlihat setelah stiker digosok/dirusak

**PENTING:** QR info-scan dan area redeem code HARUS terpisah secara fisik. QR info-scan bisa diakses siapa saja tanpa merusak kartu. Redeem code hanya bisa diakses dengan merusak stiker scratch-off (sesuai ADR-005).

## 5. Penamaan File — WAJIB Cocok dengan Data di MongoDB

Supaya tidak perlu rename manual saat upload ke `artworkUrl`, gunakan nama file **persis sama** dengan `templateId` yang sudah di-seed:

```
common-1.png
common-2.png
rare-1.png
rare-2.png
epic-1.png
epic-2.png
legendary-1.png
legendary-2.png
card-back.png   (satu file, dipakai untuk semua)
```

## 6. Urutan Kerja yang Disarankan

1. **Mulai dari 1 kartu dulu** (misal `common-1.png`) — generate, terapkan ke template desain (border, logo, rarity icon), cetak 1 sample fisik dengan card back, tempel scratch-off, cek apakah proporsi/posisi semua elemen pas secara fisik.
2. Setelah 1 kartu ini "template desain"-nya fix (posisi border, logo, rarity icon, area QR di back), **generate 7 sisanya lebih cepat** karena tinggal ganti ilustrasi utama + warna rarity, bukan desain ulang dari nol.
3. Card back cukup dikerjakan **satu kali** di awal, dipakai untuk semua.

## 7. Yang BELUM Perlu Dipikirkan Sekarang

- Card numbering/set info formal (opsional, bisa skip untuk demo hackathon)
- Bleed area/crop marks untuk percetakan profesional (tidak perlu untuk cetak rumahan dengan printer sendiri)
- Variasi ilustrasi ekstra per kartu (foil pattern kompleks, dsb) — cukup border + glow sederhana untuk membedakan rarity
