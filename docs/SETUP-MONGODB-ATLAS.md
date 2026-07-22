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

## Langkah 6: Beri Tahu Saya

Setelah Anda mendapatkan connection string, **beri tahu saya** dengan cara:
1. Copy connection string lengkap (termasuk password)
2. Paste di chat ini

Saya akan:
1. Update kode untuk menggunakan MongoDB Atlas
2. Update environment variables di Vercel
3. Redeploy frontend

## Checklist

- [ ] Akun MongoDB Atlas dibuat
- [ ] Cluster M0 Free dibuat
- [ ] Database user dibuat dengan password
- [ ] Network access dikonfigurasi (Allow Access from Anywhere)
- [ ] Connection string didapatkan
- [ ] Connection string diberikan ke saya

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

Untuk hackathon demo, kita simpan private key di database. Untuk produksi:
- Enkripsi private key sebelum disimpan
- Gunakan environment variables untuk sensitive data
- Implementasi proper authentication

## Next Steps

Setelah Anda memberikan connection string:
1. Saya akan update kode Next.js API routes
2. Ganti in-memory storage dengan MongoDB
3. Update environment variables di Vercel
4. Redeploy frontend
5. Test semua endpoint
