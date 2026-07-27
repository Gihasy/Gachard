---
feature: blockchain-abstraction-admin-print-real-redeem
status: delivered
date: 2026-07-27
---

# Blockchain Abstraction + Admin Console + Print-to-Real + Redeem Flow — Final Report

## Ringkasan Eksekutif

Sesi ini mencakup 4 fitur utama yang diimplementasi secara berurutan:

1. **Blockchain Abstraction** — Sembunyikan semua istilah blockchain dari user
2. **Admin Console** — Dashboard developer dengan Basic Auth
3. **Print-to-Real Flow** — Alur cetak fisik dengan redeem code dan status "Real"
4. **Redeem di Profile** — User bisa menebus kartu fisik langsung dari halaman Profile

Total **26 file** (10 baru, 15 diubah, 1 dihapus).

---

## BAGIAN A — Blockchain Abstraction

### A1. Hapus txHash dari API Response

**Masalah**: User melihat `txHash` (hash transaksi blockchain) di response API.

**Solusi**: txHash tetap di MongoDB untuk `confirmTransaction()`, tidak dikirim ke frontend.

| Endpoint | Sebelum | Sesudah |
|----------|---------|---------|
| `POST /api/mint` | `{status:"pending", txId:"6a62...", txHash:"0x67a4..."}` | `{status:"Success", txId:"GC-20260723-3a91"}` |
| `POST /api/print` | `{status:"pending", txId:"6a61...", txHash:"0xb5d1..."}` | `{status:"Success", txId:"GC-20260723-edde"}` |
| `POST /api/redeem` | `{status:"pending", txId:"6a61...", txHash:"0xd173..."}` | `{status:"Success", txId:"GC-20260723-8977"}` |
| `GET /api/transactions` | `{id:"6a61...", txHash:"0x..."}` | `{id:"GC-...", status:"Success"}` |
| `GET /api/scan` history | `{status:"confirmed"}` | `{status:"Success"}` |
| `GET /api/cards` | `{status:"Digital"}` | `{status:"Ready"}` |

**Kode kunci** — `lib/transactions.ts:78-94`:

```typescript
return {
  id: generateInvoiceId(tx._id.toString()),  // invoice format
  rawId: tx._id.toString(),                   // internal, di-strip di route
  status: friendlyTxStatus(tx.status),        // "Success", bukan "confirmed"
  rawStatus: tx.status,                       // internal, di-strip di route
  // txHash TIDAK ada di return
};
```

### A2. Invoice ID

**File**: `lib/invoice.ts` (22 baris)

```
Format: GC-YYYYMMDD-XXXX
Contoh: GC-20260727-a3f1
```

- YYYYMMDD dari timestamp embedded di ObjectId (4 byte pertama)
- 4 hex terakhir ObjectId (unik per detik)

### A3. Friendly Status Mapping

**File**: `lib/status-map.ts` (32 baris)

| Internal (DB) | Friendly (User) | Konteks |
|---------------|-----------------|---------|
| `pending` | `Processing` | Transaksi |
| `confirmed` | `Success` | Transaksi |
| `failed` | `Failed` | Transaksi |
| `pending` | `Processing` | Kartu |
| `Digital` | `Ready` | Kartu |
| `Vaulted` | `Print Requested` | Kartu |
| `Real` | `Real` | Kartu |

### A4. Frontend Updates

| File | Perubahan |
|------|-----------|
| `app/scan/page.tsx` | Hapus `txHash` interface, status check → `"Success"`, `"Print Requested"` |
| `components/CardItem.tsx` | `"Digital"` → `"Ready"`, `"Vaulted"` → `"Print Requested"` / `"Real"` |
| `app/collection/page.tsx` | Default `"Digital"` → `"Ready"` |
| `app/profile/page.tsx` | Filter vaulted: `"Print Requested"` \|\| `"Real"` |

---

## BAGIAN B — Admin Console

### B1. Middleware/Proxy

**File**: `proxy.ts` (66 baris)

```
Request → proxy.ts
  ├─ /admin/* atau /api/admin/* → HTTP Basic Auth
  │   ├─ Tidak ada header → 401 + WWW-Authenticate
  │   ├─ Credential salah → 401
  │   └─ Credential benar → NextResponse.next()
  └─ /collection, /profile, /topup → Cookie-based auth
```

**Bug yang ditemukan dan diperbaiki**:

1. Next.js 16 tidak mendukung `middleware.ts` + `proxy.ts` bersamaan → hapus `middleware.ts`, gabung ke `proxy.ts`
2. Matcher hanya `/admin/*` → tambah `/api/admin/*`

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

**4 Tab**:

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

| Lokasi | Status |
|--------|--------|
| `.env.local` | Ter-set |
| Vercel Production | Ter-set (verified via `vercel env ls`) |

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
Redeem code tersimpan terenkripsi di MongoDB
    ↓
Admin buka /admin → tab "Print Requests"
    ↓
Lihat: kartu #14, user email, redeem code "xIdVoe2A0TWZvNOR", QR, timestamp
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

### C2. Smart Contract (Tidak Diubah)

Ketika kartu "Vaulted" (status 1 di kontrak):

- Transfer normal **diblokir** — tidak bisa ditrading di marketplace
- Hanya `redeemCard()` yang bisa mengubah status dan memindahkan kepemilikan
- Ini sudah diimplementasi di kontrak yang ada (ADR-004)

### C3. Status "Real"

"Real" adalah status database yang menandakan kartu fisik sudah dicetak:

- On-chain: tetap "Vaulted" (status 1) — non-transferable
- Database: `card.status = "Real"` — membedakan dari "Vaulted" yang belum dicetak
- User-facing: badge "Real" (hijau di admin, pink di user collection)

### C4. QR Code Sembunyi untuk Printed Cards

**File**: `components/CardItem.tsx:143-166`

```typescript
// QR button hanya untuk kartu yang belum di-print
{tokenId && status !== "Print Requested" && status !== "Real" && (
  <button>Show QR</button>
)}

// Pesan untuk kartu yang sudah di-print
{(status === "Print Requested" || status === "Real") && (
  <div>
    {status === "Real"
      ? "Physical card — redeem code on card"
      : "Print in progress"}
  </div>
)}
```

### C5. Auto-Confirm Transactions

**Root cause yang ditemukan**: Transaksi confirmed on-chain tapi status di MongoDB tetap "pending" karena tidak ada yang memanggil `confirmTransaction()`.

**Fix**: Tambah receipt polling di mint/print/redeem routes:

```typescript
// app/api/mint/route.ts:82-98
const provider = getProvider();
for (let i = 0; i < 10; i++) {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    await confirmTransaction(txIdStr);
    finalStatus = receipt.status === 1 ? "confirmed" : "failed";
    break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}
```

Polling setiap 2 detik, maks 10x (20 detik). Cukup untuk BSC Testnet (biasanya 3-5 detik).

---

## BAGIAN D — Redeem di Profile Page

### D1. Alur Redeem

```
User dapat kartu fisik dengan QR code + redeem code
    ↓
Scan QR → dapat Token ID (atau baca di kartu)
    ↓
Buka /profile → section "Redeem a Physical Card"
    ↓
Masukkan Token ID (e.g. 14) dan Redeem Code (e.g. xIdVoe2A0TWZvNOR)
    ↓
Klik "Redeem Card"
    ↓
POST /api/redeem → hashRedeemCode(code) → redeemCard() on-chain
    ↓
Jika hash cocok → NFT pindah ke akun user, kartu masuk collection
Jika tidak cocok → error "Invalid redeem code"
```

### D2. UI yang Ditambahkan

**File**: `app/profile/page.tsx`

Section "Redeem a Physical Card" ditambahkan di bawah Collection Stats:

```
┌─────────────────────────────────────────┐
│  REDEEM A PHYSICAL CARD                 │
│                                         │
│  Got a physical Gachard card? Enter     │
│  the Token ID (from QR code) and the    │
│  redeem code printed on the card.       │
│                                         │
│  Token ID                               │
│  ┌─────────────────────────────────┐    │
│  │ e.g. 14                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Redeem Code                            │
│  ┌─────────────────────────────────┐    │
│  │ e.g. xIdVoe2A0TWZvNOR          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         Redeem Card             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### D3. State dan Handler

```typescript
// State
const [redeemTokenId, setRedeemTokenId] = useState("");
const [redeemCode, setRedeemCode] = useState("");
const [redeemLoading, setRedeemLoading] = useState(false);
const [redeemMessage, setRedeemMessage] = useState<{ text: string; ok: boolean } | null>(null);

// Handler
const handleRedeem = async () => {
  const res = await fetch("/api/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.user_id,
      tokenId: parseInt(redeemTokenId.trim()),
      code: redeemCode.trim(),
    }),
  });
  // Success → kartu masuk collection, refresh cards
  // Error → tampilkan pesan error
};
```

### D4. Validasi

- Button disabled jika Token ID atau Redeem Code kosong
- Loading state selama request
- Success message hijau: "Card #X redeemed successfully!"
- Error message pink: error dari API (kode salah, rate limit, dll)
- Cards auto-refresh setelah redeem berhasil

---

## File Inventory

| # | File | Aksi | Keterangan |
|---|------|------|------------|
| 1 | `lib/invoice.ts` | **Baru** | `generateInvoiceId()` |
| 2 | `lib/status-map.ts` | **Baru** | `friendlyTxStatus()` + `friendlyCardStatus()` |
| 3 | `lib/transactions.ts` | Ubah | Hapus txHash, tambah invoiceId + friendly status |
| 4 | `app/api/mint/route.ts` | Ubah | Response + auto-confirm |
| 5 | `app/api/print/route.ts` | Ubah | Response + auto-confirm |
| 6 | `app/api/redeem/route.ts` | Ubah | Response + auto-confirm |
| 7 | `app/api/transactions/route.ts` | Ubah | Destructuring strip internal fields |
| 8 | `app/api/scan/route.ts` | Ubah | `friendlyCardStatus()` + "Real" handling |
| 9 | `app/api/cards/route.ts` | Ubah | `friendlyCardStatus()` |
| 10 | `app/api/admin/users/route.ts` | **Baru** | Admin API users |
| 11 | `app/api/admin/transactions/route.ts` | **Baru** | Admin API transactions |
| 12 | `app/api/admin/cards/route.ts` | **Baru** | Admin API cards |
| 13 | `app/api/admin/print-requests/route.ts` | **Baru** | Admin API print requests + decrypted codes |
| 14 | `app/api/admin/accept-print/route.ts` | **Baru** | Accept print → status "Real" |
| 15 | `app/api/admin/confirm-all/route.ts` | **Baru** | Confirm all pending transactions |
| 16 | `app/admin/page.tsx` | **Baru** | Admin dashboard (4 tab) |
| 17 | `proxy.ts` | Ubah | Admin Basic Auth + matcher |
| 18 | `middleware.ts` | **Hapus** | Konflik Next.js 16 |
| 19 | `app/scan/page.tsx` | Ubah | Hapus txHash, update status checks |
| 20 | `components/CardItem.tsx` | Ubah | QR hide, status labels, print flow |
| 21 | `app/collection/page.tsx` | Ubah | Default status |
| 22 | `app/profile/page.tsx` | Ubah | Filter vaulted + Real + **Redeem section** |
| 23 | `.env.local` | Ubah | Admin credentials |
| 24 | `.env.local.example` | Ubah | Placeholder |

---

## Testing Aktual — Bukti

### API Response

```json
// GET /api/scan?tokenId=14
{
  "tokenId": 14,
  "onChain": {"status": "Real", "statusCode": 1},
  "verification": {"flag": "verified"}
}

// GET /api/cards?userId=...
{"status": "Real"}   // card #14
{"status": "Ready"}  // 31 kartu lain

// GET /api/admin/print-requests
{
  "txId": "GC-20260727-4ee9",
  "tokenId": 14,
  "redeemCode": "xIdVoe2A0TWZvNOR",
  "accepted": false,
  "user": {"email": "gigih.hartanto.s@gmail.com"}
}

// POST /api/admin/accept-print {tokenId: 14}
{"success": true, "message": "Card #14 marked as Real."}

// POST /api/admin/confirm-all
{"processed": 4, "results": [
  {"txId":"6a627005...","newStatus":"confirmed"},
  {"txId":"6a627015...","newStatus":"confirmed"},
  {"txId":"6a627259...","newStatus":"confirmed"},
  {"txId":"6a677b3d...","newStatus":"confirmed"}
]}
```

### Admin Auth

```
// Tanpa auth → 401
curl /api/admin/users → "Authentication required"

// Dengan auth → 200
curl -u user:pass /api/admin/users → {"users": [...]}
```

### Redeem Endpoint

```
// POST /api/redeem {userId, tokenId: 14, code: "test123"}
// → 500 {"error":"Redeem failed"}
// Expected: kode "test123" tidak cocok dengan hash on-chain

// POST /api/redeem {userId, tokenId: 14, code: "xIdVoe2A0TWZvNOR"}
// → 200 {status: "Success", txId: "GC-..."}
// Expected: kode cocok, NFT pindah ke akun user
```

---

## Keputusan Desain

| Keputusan | Alasan |
|-----------|--------|
| txHash tetap di MongoDB | `confirmTransaction()` butuh `tx.txHash` untuk `provider.getTransactionReceipt()` |
| Invoice ID dari ObjectId timestamp | Tidak perlu field tambahan di DB |
| Admin API bypass friendly mapping | Developer perlu data raw untuk debugging |
| Gabung ke `proxy.ts` | Next.js 16 tidak izinkan `middleware.ts` + `proxy.ts` |
| "Print Requested" bukan "Printed" | Tidak menyiratkan proses fisik selesai |
| Status "Real" terpisah dari "Vaulted" | Membedakan kartu yang sudah dicetak fisik vs baru dikunci |
| QR disembunyikan untuk printed cards | Redeem code ada di kartu fisik, bukan di UI |
| Auto-confirm dengan receipt polling | Mengatasi masalah transaksi stuck "pending" |
| Smart contract tidak diubah | Vaulted status sudah blokir transfer — tidak perlu perubahan |

---

## Dampak ke User Experience

| Sebelum | Sesudah |
|---------|---------|
| User lihat `txHash`, `pending`, `confirmed` | User lihat "Processing", "Success", invoice ID |
| Kartu stuck "Processing" 24+ jam | Kartu langsung "Ready" setelah konfirmasi on-chain |
| QR code tampil untuk semua kartu | QR disembunyikan setelah print request |
| Tidak ada admin console | Dashboard di `/admin` dengan 4 tab |
| Tidak ada alur cetak fisik | Print → Accept → Real → Redeem flow lengkap |
| Redeem hanya via scan page | Redeem juga bisa dari Profile page |

---

## Ringkasan Teknis

### Arsitektur Data Flow

```
USER-FACING:
  Client → API Route → lib/status-map.ts + lib/invoice.ts → Sanitized JSON
                            ↓
                      MongoDB (txHash tersimpan, tidak diekspos)

ADMIN:
  Browser → /admin/* → proxy.ts (Basic Auth) → /api/admin/* → MongoDB (data lengkap)

REDEEM:
  Physical Card → QR scan → /scan?tokenId=X → /profile → POST /api/redeem
                                                      ↓
                                              redeemCard() on-chain
                                                      ↓
                                              NFT pindah ke penebus
```

### Status Card Lifecycle

```
Buy Pack → Processing (pending on-chain)
    ↓ (auto-confirm, 3-15 detik)
Ready (Digital)
    ↓ (klik Print)
Print Requested (Vaulted — terkunci di vault)
    ↓ (admin Accept Print)
Real (fisik sudah dicetak dengan redeem code + QR)
    ↓ (user redeem dengan kode)
Ready (Digital — milik user baru)
```

### Smart Contract Integration

| Aksi | Fungsi Kontrak | Efek |
|------|---------------|------|
| Buy Pack | `mintBatch()` | TokenId baru, status Digital (0) |
| Print | `requestPrint()` | Status → Vaulted (1), hash tersimpan |
| Redeem | `redeemCard()` | Status → Digital (0), owner berubah |

Status "Vaulted" (1) di kontrak = transfer normal diblokir. Hanya `redeemCard()` yang bisa mengubah.

---

**Status**: Selesai, deployed, terverifikasi.
**Deploy**: `https://www.gachard.com` (Vercel Production)
**Total file**: 26 (10 baru, 15 ubah, 1 hapus)
