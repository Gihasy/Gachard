# Panduan Setup MongoDB Atlas untuk Gachard

## Langkah 1: Buat Akun MongoDB Atlas

1. Buka https://www.mongodb.com/atlas/database
2. Klik **"Try Free"** atau **"Start Free"**
3. Buat akun dengan email Anda (atau login dengan Google)
4. Isi formulir pendaftaran:
   - First Name: (nama Anda)
   - Last Name: (nama Anda)
   - Email: (email Anda)
   - Password: (buat password)
5. Klik **"Create Account"**

## Langkah 2: Buat Cluster

1. Setelah login, Anda akan melihat halaman "Create a cluster"
2. Pilih **"M0 Free"** tier (gratis)
3. Provider: **AWS** (default)
4. Region: **Singapore** (atau yang terdekat dengan Indonesia)
5. Cluster Name: `gachard-cluster` (atau nama lain)
6. Klik **"Create Cluster"**
7. Tunggu beberapa menit hingga cluster siap

## Langkah 3: Buat Database User

1. Setelah cluster dibuat, klik **"Database Access"** di sidebar kiri
2. Klik **"Add New Database User"**
3. Isi formulir:
   - Username: `gachard-user` (atau nama lain)
   - Password: **Generate Secure Password** (klik tombol ini)
   - **COPY PASSWORD INI** — Anda akan membutuhkannya nanti!
4. Klik **"Add User"**

## Langkah 4: Setup Network Access

1. Klik **"Network Access"** di sidebar kiri
2. Klik **"Add IP Address"**
3. Pilih **"Allow Access from Anywhere"** (untuk development)
4. Klik **"Confirm"**

## Langkah 5: Dapatkan Connection String

1. Klik **"Database"** di sidebar kiri
2. Klik **"Connect"** pada cluster Anda
3. Pilih **"Connect your application"**
4. Copy connection string
5. Format: `mongodb+srv://gachard-user:<password>@gachard-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. **Ganti `<password>`** dengan password yang Anda buat di Langkah 3

**CONTOH:**
Jika password Anda adalah `ABC123xyz`, maka connection string menjadi:
```
mongodb+srv://gachard-user:ABC123xyz@gachard-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Langkah 6: Pasang Connection String

1. Salin connection string lengkap, termasuk password yang sudah diganti
2. Isikan sebagai `MONGODB_URL` di `frontend/.env.local` untuk development
   (lihat `frontend/.env.local.example`)
3. Untuk produksi, isikan variabel yang sama di Environment Variables project Vercel,
   lalu redeploy

Connection string memuat kredensial database. Jangan pernah commit `.env.local`, jangan
menempelkannya di chat, isu, atau pull request.

## Checklist

- [ ] Akun MongoDB Atlas dibuat
- [ ] Cluster M0 Free dibuat
- [ ] Database user dibuat dengan password
- [ ] Network access dikonfigurasi (Allow Access from Anywhere)
- [ ] Connection string didapatkan
- [ ] `MONGODB_URL` terpasang di `.env.local` dan di Vercel

## Troubleshooting

### Cluster tidak muncul
- Tunggu beberapa menit — cluster sedang dibuat
- Refresh halaman

### Lupa password
- Klik "Database Access" di sidebar
- Klik "Edit" pada user Anda
- Klik "Edit Password"
- Generate password baru

### Connection string tidak berfungsi
- Pastikan password sudah diganti (tanpa `<>`)
- Pastikan network access sudah dikonfigurasi
- Pastikan cluster sudah aktif (status: "Active")

### Tidak bisa akses MongoDB Atlas
- Coba gunakan browser lain
- Clear cache browser
- Cek koneksi internet

## Keuntungan MongoDB Atlas

- **Free tier**: 512 MB storage, shared RAM
- **Tidak perlu kartu kredit**
- **Auto-backup**: Data otomatis di-backup
- **HTTPS**: Koneksi terenkripsi
- **Scalable**: Bisa upgrade nanti jika perlu

## Data yang Akan Disimpan

Dengan MongoDB Atlas, data berikut akan tersimpan secara permanen:
- User data (email, username, Google ID)
- Wallet address dan private key
- Login history
- Data lainnya untuk hackathon demo

## Keamanan

Private key wallet custodial **tidak** disimpan dalam bentuk polos. Setiap key dienkripsi
dengan AES-256-GCM sebelum masuk MongoDB (ADR-020), memakai `ENCRYPTION_SECRET_KEY` yang
hanya hidup di environment variable dan tidak pernah ikut tersimpan di database. Kompromi
database saja tidak cukup untuk mendekripsinya.

Yang tetap perlu dijaga saat setup:

- Batasi Network Access ke IP yang diperlukan begitu tahap development selesai. "Allow
  Access from Anywhere" hanya pantas untuk pengembangan awal.
- Pakai user database terpisah untuk development dan produksi.
- `ENCRYPTION_SECRET_KEY` minimal 32 karakter dan tidak pernah dipakai ulang sebagai token
  atau password untuk keperluan lain.

## Setelah Terhubung

Collection dibuat otomatis oleh aplikasi saat pertama kali dipakai, jadi tidak ada skema
yang perlu disiapkan manual. Yang utama antara lain `users`, `cards`, `transactions`,
`listings`, `credits`, `crystal_balances`, `card_templates`, dan `redeem_codes`.

Cek koneksi lewat `GET /api/health`, yang mengembalikan `{"status":"ok","database":"connected"}`
kalau MongoDB sudah terjangkau.
