---
feature: blockchain-abstraction-admin-print-real-redeem-ui
status: delivered
date: 2026-07-27
commit: 3fc40c7
---

# Blockchain Abstraction + Admin Console + Print-to-Real + Redeem + UI Overhaul — Final Report

## Ringkasan Eksekutif

Sesi ini mencakup 7 fitur/perbaikan yang diimplementasi secara berurutan:

1. **Blockchain Abstraction** — Sembunyikan semua istilah blockchain dari user
2. **Admin Console** — Dashboard developer dengan Basic Auth
3. **Print-to-Real Flow** — Alur cetak fisik dengan redeem code dan status "Real"
4. **Redeem di Profile** — User bisa menebus kartu fisik dari halaman Profile
5. **NFT Ownership Fix** — NFT tetap di wallet user saat print (bukan dipindah ke vault)
6. **Scan Page Enhancement** — Username resolution, admin label, kartu 5:7 ratio
7. **UI Overhaul** — Hapus rarity badge, stats, QR; ganti nama, status, ratio kartu

Total **29 file** (10 baru, 18 ubah, 1 hapus). Commit: `3fc40c7`.

---

## BAGIAN A — Blockchain Abstraction

### A1. Hapus txHash dari API Response

| Endpoint | Sebelum | Sesudah |
|----------|---------|---------|
| `POST /api/mint` | `{status:"pending", txId:"6a62...", txHash:"0x67a4..."}` | `{status:"Success", txId:"GC-20260723-3a91"}` |
| `POST /api/print` | `{status:"pending", txId:"6a61...", txHash:"0xb5d1..."}` | `{status:"Success", txId:"GC-20260723-edde"}` |
| `POST /api/redeem` | `{status:"pending", txId:"6a61...", txHash:"0xd173..."}` | `{status:"Success", txId:"GC-20260723-8977"}` |
| `GET /api/transactions` | `{id:"6a61...", txHash:"0x..."}` | `{id:"GC-...", status:"Success"}` |
| `GET /api/scan` history | `{status:"confirmed"}` | `{status:"Success"}` |
| `GET /api/cards` | `{status:"Digital"}` | `{status:"Digital"}` |

txHash tetap di MongoDB untuk `confirmTransaction()`, tidak dikirim ke frontend.

### A2. Invoice ID

**File**: `lib/invoice.ts`

```
Format: GC-YYYYMMDD-XXXX
Contoh: GC-20260727-a3f1
```

### A3. Friendly Status Mapping

**File**: `lib/status-map.ts`

| Internal (DB) | Friendly (User) | Konteks |
|---------------|-----------------|---------|
| `pending` | `Processing` | Transaksi |
| `confirmed` | `Success` | Transaksi |
| `failed` | `Failed` | Transaksi |
| `pending` | `Processing` | Kartu |
| `Digital` | `Digital` | Kartu |
| `Vaulted` | `Print Requested` | Kartu |
| `Real` | `Real` | Kartu |

### A4. Auto-Confirm Transactions

**Root cause**: Transaksi confirmed on-chain tapi status MongoDB tetap "pending" karena tidak ada yang memanggil `confirmTransaction()`.

**Fix**: Receipt polling di mint/print/redeem routes (setiap 2 detik, maks 10x).

### A5. Google Auth Fix

- `verifyGoogleToken()` menggunakan `google-auth-library` (verifyIdToken) untuk verifikasi signature JWT
- `wallet_address` dihapus dari response POST /api/auth/google

---

## BAGIAN B — Admin Console

### B1. Middleware/Proxy

**File**: `proxy.ts`

```
Request → proxy.ts
  ├─ /admin/* atau /api/admin/* → HTTP Basic Auth
  └─ /collection, /profile, /topup → Cookie-based auth
```

Bug yang diperbaiki: Next.js 16 tidak mendukung `middleware.ts` + `proxy.ts` bersamaan.

### B2. Admin API Routes

| Route | File | Response |
|-------|------|----------|
| `GET /api/admin/users` | `app/api/admin/users/route.ts` | `{users: [{id, email, username, walletAddress, createdAt}]}` |
| `GET /api/admin/transactions` | `app/api/admin/transactions/route.ts` | `{transactions: [{id:"GC-...", rawId, txHash, status, rawStatus, type, ...}]}` |
| `GET /api/admin/cards` | `app/api/admin/cards/route.ts` | `{cards: [{tokenId, templateId, rarity, status, ownerAddress}]}` |
| `GET /api/admin/print-requests` | `app/api/admin/print-requests/route.ts` | `{printRequests: [{txId, tokenId, redeemCode, accepted, user, card, ...}]}` |
| `POST /api/admin/accept-print` | `app/api/admin/accept-print/route.ts` | `{success, tokenId, message}` |
| `POST /api/admin/confirm-all` | `app/api/admin/confirm-all/route.ts` | `{processed, results}` |

### B3. Admin Page

**File**: `app/admin/page.tsx` (~350 baris)

| Tab | Data | Fitur Khusus |
|-----|------|-------------|
| Users | email, username, wallet address lengkap, tanggal daftar | — |
| Transactions | invoice ID + raw ID, txHash + BscScan link, status, type, timestamp | — |
| Cards | tokenId, templateId, rarity, status (color-coded), owner | Status "Real" = hijau |
| **Print Requests** | kartu #, user info, **redeem code (decrypted)**, **QR code**, timestamp | **Accept Print button** |

### B4. Admin Credentials

```
ADMIN_USERNAME=gachard-admin-aaafac
ADMIN_PASSWORD=qPBfAqpqYgYheb5T6_w-h1sB
```

Ter-set di `.env.local` dan Vercel Production.

---

## BAGIAN C — Print-to-Real Flow

### C1. Alur Lengkap

```
User klik "Print" (Collection page)
    ↓
POST /api/print/checkout → simulasi Stripe ($9.99)
    ↓
POST /api/print → generateRedeemCode() → hash → requestPrint() on-chain
    ↓
Kartu terkunci di vault (status on-chain: "Vaulted")
NFT tetap di wallet user (TIDAK dipindah ke vault address)
Redeem code tersimpan terenkripsi di MongoDB
    ↓
Admin buka /admin → tab "Print Requests"
    ↓
Lihat: kartu #14, user email, redeem code, QR, timestamp
    ↓
Klik "Accept Print"
    ↓
POST /api/admin/accept-print → kartu status → "Real"
    ↓
Kartu fisik dicetak dengan redeem code + QR code
    ↓
User lain scan QR → masukkan redeem code → POST /api/redeem
    ↓
redeemCard() on-chain → NFT pindah ke akun penebus
```

### C2. NFT Ownership — Tidak Dipindah ke Vault

**Keputusan desain penting**: NFT **tetap di wallet user** saat print. Smart contract yang memblokir transfer (status "Vaulted" = 1), bukan pemindahan ke vault address.

```
SEBELUM (salah):
  Print → NFT pindah ke vault → user kehilangan kartu

SESUDAH (benar):
  Print → NFT tetap di wallet user → status "Vaulted" di kontrak
         → smart contract blokir transfer
         → kartu tetap di collection user dengan badge "Real"
         → user tetap bisa main, scan, lihat stats
```

| Tahap | NFT di | Status On-chain | Status DB | Bisa Transfer? | Di Collection? |
|-------|--------|-----------------|-----------|----------------|----------------|
| Mint | Wallet user | Digital (0) | Digital | Ya | Ya |
| Print | Wallet user | Vaulted (1) | Print Requested | **Tidak** | Ya |
| Accept | Wallet user | Vaulted (1) | Real | **Tidak** | Ya |
| Redeem | Wallet penebus | Digital (0) | Digital | Ya | Ya (penebus) |

### C3. QR Code Sembunyi untuk Printed Cards

Kartu dengan status "Print Requested" atau "Real":
- QR button **dihapus**
- Tampilkan pesan: "Print in progress" atau "Physical card — redeem code on card"

---

## BAGIAN D — Redeem di Profile Page

### D1. Alur Redeem

```
User dapat kartu fisik dengan QR code + redeem code
    ↓
Scan QR → dapat Card ID (atau baca di kartu)
    ↓
Buka /profile → section "Redeem a Physical Card"
    ↓
Masukkan Card ID dan Redeem Code
    ↓
Klik "Redeem Card"
    ↓
POST /api/redeem → hashRedeemCode(code) → redeemCard() on-chain
    ↓
Jika hash cocok → NFT pindah ke akun user, kartu masuk collection
```

### D2. UI

Section "Redeem a Physical Card" di halaman Profile:
- Input Card ID (number)
- Input Redeem Code (text, monospace)
- Button "Redeem Card"
- Success/error message

---

## BAGIAN E — Scan Page Enhancement

### E1. Username Resolution

**File**: `app/api/scan/route.ts`

- Lookup semua wallet address di transactions → resolve ke username dari users collection
- `lastOwner` tampilkan `@username` (bukan truncated address)
- History `from`/`to` tampilkan `@username` (bukan address)
- Admin wallet address (`0xF7DEd49...`) → tampilkan **"Gachard"**
- Vault address → tampilkan **"Gachard Vault"**

### E2. Kartu 5:7 Ratio

- `aspect-[3/4]` → `aspect-ratio: 5/7` (sesuai 1500x2100px)
- `object-cover` → `object-contain` (tidak crop)

---

## BAGIAN F — UI Overhaul

### F1. Hapus Rarity Badge

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Collection page cards | Badge "Common"/"Rare"/"Epic"/"Legendary" di pojok kartu | **Dihapus** |
| Homepage hero cards | Badge "EPIC"/"MYTHIC"/"RARE" + gradient overlay | **Dihapus** — hanya gambar |
| Homepage featured cards | Badge + nama + stats ATK/DEF/HP | **Dihapus** — hanya gambar |

### F2. Ganti Nama Kartu

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Collection page | `templateId` (e.g. "common-2") | `Card #14` |

### F3. Hapus QR Button

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Collection page | "Show QR" + "Print" button | Hanya **"Print"** button |

### F4. Ganti Status Label

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Semua | "Ready" | **"Digital"** |

### F5. Hapus Balance dari Homepage

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Homepage hero | Balance chip "Balance • X Credit" | **Dihapus** |

### F6. Hapus Season 1 References

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Profile page | "Season 1 Collector" chip | **Dihapus** |
| Profile page | "Season 1 progress" bar + "X of 168 cards" | **Dihapus** |

### F7. Ganti Token ID → Card ID

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Scan page | "Token ID" | **"Card ID"** |
| Profile redeem | "Token ID" | **"Card ID"** |
| Admin page | "Token ID" | **"Card ID"** |

### F8. Kartu 5:7 Ratio (1500x2100px)

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Homepage hero | `height: 310/270`, `object-cover` | `aspect-ratio: 5/7`, `object-contain` |
| Homepage featured | `aspect-[3/4]`, `object-cover` | `aspect-ratio: 5/7`, `object-contain` |
| Collection page | `aspect-[3/4]`, `object-cover` | `aspect-ratio: 5/7`, `object-contain` |
| Scan page | `aspect-[3/4]`, `object-cover` | `aspect-ratio: 5/7`, `object-contain` |

---

## File Inventory

| # | File | Aksi | Keterangan |
|---|------|------|------------|
| 1 | `lib/invoice.ts` | **Baru** | `generateInvoiceId()` |
| 2 | `lib/status-map.ts` | **Baru** | `friendlyTxStatus()` + `friendlyCardStatus()` |
| 3 | `lib/transactions.ts` | Ubah | Hapus txHash, tambah invoiceId + friendly status + auto-confirm |
| 4 | `lib/auth.ts` | Ubah | Google Auth library, hapus wallet_address |
| 5 | `app/api/mint/route.ts` | Ubah | Response + auto-confirm |
| 6 | `app/api/print/route.ts` | Ubah | Response + auto-confirm |
| 7 | `app/api/redeem/route.ts` | Ubah | Response + auto-confirm |
| 8 | `app/api/transactions/route.ts` | Ubah | Destructuring strip internal fields |
| 9 | `app/api/scan/route.ts` | Ubah | Username resolution, Gachard label, 5:7 ratio |
| 10 | `app/api/cards/route.ts` | Ubah | `friendlyCardStatus()` |
| 11 | `app/api/auth/google/route.ts` | Ubah | Hapus wallet_address |
| 12 | `app/api/admin/users/route.ts` | **Baru** | Admin API users |
| 13 | `app/api/admin/transactions/route.ts` | **Baru** | Admin API transactions |
| 14 | `app/api/admin/cards/route.ts` | **Baru** | Admin API cards |
| 15 | `app/api/admin/print-requests/route.ts` | **Baru** | Admin API print requests + decrypted codes |
| 16 | `app/api/admin/accept-print/route.ts` | **Baru** | Accept print → status "Real" |
| 17 | `app/api/admin/confirm-all/route.ts` | **Baru** | Confirm all pending transactions |
| 18 | `app/admin/page.tsx` | **Baru** | Admin dashboard (4 tab) |
| 19 | `proxy.ts` | Ubah | Admin Basic Auth + matcher |
| 20 | `middleware.ts` | **Hapus** | Konflik Next.js 16 |
| 21 | `app/page.tsx` | Ubah | Hapus balance state + fetch |
| 22 | `app/profile/page.tsx` | Ubah | Redeem section, hapus Season 1 |
| 23 | `app/scan/page.tsx` | Ubah | Username, Card ID, 5:7 ratio |
| 24 | `components/CardItem.tsx` | Ubah | Hapus rarity badge, QR; Card #X; Digital; 5:7 |
| 25 | `components/home/HomeHero.tsx` | Ubah | Hapus badge, gradient; 5:7 ratio |
| 26 | `components/home/HomeFeaturedCards.tsx` | Ubah | Hapus badge, nama, stats; 5:7 ratio |
| 27 | `app/collection/page.tsx` | Ubah | Default "Digital" |
| 28 | `package.json` | Ubah | +google-auth-library |
| 29 | `package-lock.json` | Ubah | Auto-update |

---

## Testing Aktual — Bukti

### API Response

```json
// GET /api/scan?tokenId=14
{
  "tokenId": 14,
  "onChain": {"status": "Real", "statusCode": 1},
  "verification": {"flag": "verified"},
  "history": [
    {"type": "print", "from": "@gigih.hartanto.s", "to": "Gachard Vault"},
    {"type": "mint", "from": "Gachard", "to": "@gigih.hartanto.s"}
  ]
}

// GET /api/cards?userId=...
{"status": "Digital"}  // 30 kartu
{"status": "Real"}     // 1 kartu

// GET /api/admin/print-requests
{
  "txId": "GC-20260727-4ee9",
  "tokenId": 14,
  "redeemCode": "xIdVoe2A0TWZvNOR",
  "accepted": true
}

// POST /api/admin/confirm-all
{"processed": 4, "results": [{"newStatus":"confirmed"}, ...]}
```

### Commit

```
3fc40c7 feat: blockchain abstraction, admin console, print-to-real flow, redeem, UI overhaul
29 files changed, 2032 insertions(+), 248 deletions(-)
```

---

## Keputusan Desain

| Keputusan | Alasan |
|-----------|--------|
| txHash tetap di MongoDB | `confirmTransaction()` butuh untuk cek receipt on-chain |
| Invoice ID dari ObjectId timestamp | Tidak perlu field tambahan di DB |
| Admin API bypass friendly mapping | Developer perlu data raw untuk debugging |
| Gabung ke `proxy.ts` | Next.js 16 tidak izinkan `middleware.ts` + `proxy.ts` |
| NFT tetap di wallet user saat print | User tetap bisa main, scan, lihat stats. Smart contract blokir transfer |
| Status "Real" terpisah dari "Vaulted" | Membedakan kartu yang sudah dicetak fisik vs baru dikunci |
| QR disembunyikan untuk printed cards | Redeem code ada di kartu fisik, bukan di UI |
| Auto-confirm dengan receipt polling | Mengatasi masalah transaksi stuck "pending" |
| Smart contract tidak diubah | Vaulted status sudah blokir transfer |
| Admin address → "Gachard" | Lebih ramah user daripada raw address |
| Kartu 5:7 ratio + object-contain | Sesuai ukuran asli 1500x2100px, tidak crop |
| Hapus rarity badge dan stats | UI lebih bersih, fokus pada gambar kartu |
| "Digital" bukan "Ready" | Konsisten dengan terminologi on-chain |

---

## Dampak ke User Experience

| Sebelum | Sesudah |
|---------|---------|
| User lihat `txHash`, `pending`, `confirmed` | User lihat "Processing", "Success", "Digital", invoice ID |
| Kartu stuck "Processing" 24+ jam | Kartu langsung "Digital" setelah konfirmasi on-chain |
| QR code tampil untuk semua kartu | QR disembunyikan setelah print request |
| Tidak ada admin console | Dashboard di `/admin` dengan 4 tab |
| Tidak ada alur cetak fisik | Print → Accept → Real → Redeem flow lengkap |
| Redeem hanya via scan page | Redeem juga bisa dari Profile page |
| NFT hilang dari collection saat print | NFT tetap di collection user dengan badge "Real" |
| Scan tampilkan wallet address | Scan tampilkan `@username` dan "Gachard" |
| Kartu terpotong (3:4 ratio) | Kartu utuh (5:7 ratio, 1500x2100px) |
| Rarity badge, stats, nama di kartu | Hanya gambar kartu bersih |
| "Ready" status | "Digital" status |
| Balance di homepage | Balance hanya di Profile dan Top Up |
| "Season 1 Collector" | Dihapus |
| "Token ID" | "Card ID" |

---

**Status**: Selesai, deployed, committed.
**Deploy**: `https://www.gachard.com` (Vercel Production)
**Commit**: `3fc40c7`
**Total file**: 29 (10 baru, 18 ubah, 1 hapus)
**Total perubahan**: +2032 / -248 baris
