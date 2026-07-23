# Laporan Sprint 5 — Fitur AI Scan
**Tanggal**: 23 Juli 2026
**Status**: SELESAI, ter-deploy
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan Eksekutif

Sprint 5 mengimplementasikan fitur AI Scan — wajib untuk tema hackathon "AI x Web3". User bisa scan kartu (fisik via QR atau digital) dan melihat metadata lengkap: rarity, status vault, riwayat kepemilikan, flag verifikasi. Beberapa perbaikan terkait juga diterapkan (purchasePrice, tokenIds array, QR info-scan terpisah dari redeem code).

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 1 | QR code generation | Done | `lib/qr.ts` + `GET /api/cards/:tokenId/qr` |
| 2 | Scan API | Done | `GET /api/scan?tokenId=...` |
| 3 | Scan page | Done | `/scan` dengan verification flag |
| 4 | QR di CardItem | Done | "Show QR" button |
| 5 | purchasePrice | Done | Dari mint transaction |
| 6 | tokenIds array | Done | Populate saat konfirmasi |
| 7 | card-artwork-guideline | Done | QR info-scan terpisah dari redeem |
| 8 | AI Vision | Opsional | Belum diimplementasi |

---

## 3. Definition of Done — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Scan kartu menghasilkan data akurat | Pass | `/api/scan` return on-chain + off-chain data |
| Flag verifikasi tampil | Pass | ✅ / ⚠️ di scan page |
| QR code bisa di-generate | Pass | `/api/cards/:tokenId/qr` return PNG |

---

## 4. File yang Dibuat/Dimodifikasi

### File Baru

| File | Fungsi |
|---|---|
| `frontend/lib/qr.ts` | QR code generation (data URL + PNG buffer) |
| `frontend/app/api/scan/route.ts` | Scan endpoint — on-chain + off-chain + history |
| `frontend/app/api/cards/[tokenId]/qr/route.ts` | QR code image endpoint |
| `frontend/app/scan/page.tsx` | Scan page UI |

### File Dimodifikasi

| File | Perubahan |
|---|---|
| `frontend/lib/transactions.ts` | Tambah `tokenIds` array collection + populate saat konfirmasi |
| `frontend/app/api/mint/route.ts` | Tambah `tokenIds: []` dan `purchasePrice` ke transaction record |
| `frontend/components/CardItem.tsx` | Tambah "Show QR" button + QR display |
| `frontend/components/Navbar.tsx` | Tambah "Scan" link |
| `docs/card-artwork-guideline.md` | Pisahkan QR info-scan dari redeem code |

---

## 5. QR Code System

### 5.1 QR Generation (`lib/qr.ts`)

```typescript
generateQRData(tokenId) → "https://frontend-rosy-pi-88.vercel.app/scan?tokenId=6"
generateQRCode(tokenId) → base64 data URL
generateQRCodeBuffer(tokenId) → PNG Buffer
```

### 5.2 QR API Route

| Endpoint | Method | Response |
|---|---|---|
| `/api/cards/:tokenId/qr` | GET | PNG image (256x256) |

QR berisi URL ke `/scan?tokenId=...` — siapa saja bisa scan untuk lihat info kartu.

### 5.3 QR di CardItem

- Tombol "Show QR" muncul untuk semua kartu dengan tokenId terisi
- Klik menampilkan QR code 128x128 di bawah kartu

---

## 6. Scan System

### 6.1 Scan API (`/api/scan`)

**Request:** `GET /api/scan?tokenId=6`

**Response:**
```json
{
  "tokenId": 6,
  "onChain": {
    "status": "Vaulted",
    "statusCode": 1,
    "rarity": "Legendary",
    "rarityCode": 3,
    "lastOwner": "0xF7DEd49EB412F69520c38C3f7e36523d71428DEa"
  },
  "metadata": {
    "templateId": "legendary-2",
    "templateName": "Legendary Card B",
    "artworkUrl": "/cards/legendary-2.png"
  },
  "purchasePrice": 500,
  "verification": {
    "verified": true,
    "statusMatch": true,
    "flag": "verified"
  },
  "history": [
    {"type": "print", "status": "confirmed", "from": "0xF7DE...", "to": "vault", "timestamp": "..."},
    {"type": "mint", "status": "confirmed", "from": "0xF7DE...", "to": "0xF7DE...", "timestamp": "..."}
  ]
}
```

### 6.2 Data Sources

| Field | Source |
|---|---|
| status, rarity, lastOwner | On-chain (ethers.js call) |
| templateId, templateName, artworkUrl | MongoDB `cards` + `card_templates` |
| purchasePrice | MongoDB `transactions` (type=mint, tokenIds match) |
| history | MongoDB `transactions` (tokenId OR tokenIds match) |
| verification.flag | Compare on-chain vs MongoDB |

### 6.3 Verification Logic

```typescript
const verified = statusOnChain !== undefined && card !== null;
const statusMatch = STATUS_LABELS[statusOnChain] === card.status;
const flag = verified && statusMatch ? "verified" : "warning";
```

- **✅ Verified**: data on-chain cocok dengan MongoDB
- **⚠️ Warning**: data mismatch atau kartu tidak ditemukan

---

## 7. Scan Page UI

| Elemen | Tampilan |
|---|---|
| Card Image | Artwork dari `artworkUrl` dengan background warna rarity |
| Verification Flag | ✅ Verified (hijau) atau ⚠️ Warning (kuning) |
| Metadata | Token ID, Name, Rarity, Status, Last Owner, Purchase Price |
| History | List transaksi (type, status, timestamp) |
| Manual Input | Input field untuk masukkan tokenId manual |

---

## 8. tokenIds Array Fix

**Masalah:** Transaksi `mintBatch` tidak menyimpan array tokenId yang di-mint.

**Solusi:**
- `/api/mint` insert `tokenIds: []` saat transaksi dibuat
- `confirmTransaction()` populate `tokenIds` dari `CardMinted` events saat konfirmasi
- `/api/scan` query history dengan `$or: [{ tokenId }, { tokenIds: tokenId }]`

**Kode (`lib/transactions.ts`):**
```typescript
if (tx.type === "mint") {
  const tokenIds: number[] = [];
  let mintIndex = 0;
  for (const log of receipt.logs) {
    if (log.topics[0] === CARD_MINTED_TOPIC && ...) {
      const tokenId = parseInt(log.topics[1], 16);
      tokenIds.push(tokenId);
      // ... update cards collection
      mintIndex++;
    }
  }
  // Update transaksi dengan array tokenIds
  if (tokenIds.length > 0) {
    await collection.updateOne({ _id: tx._id }, { $set: { tokenIds } });
  }
}
```

---

## 9. card-artwork-guideline Update

**Perubahan:** Pisahkan QR info-scan dari redeem code secara fisik.

| Area | Posisi | Visibility | Isi |
|---|---|---|---|
| QR Info-Scan | Pojok atas/bawah (~1.5cm) | SELALU terlihat | URL `/scan?tokenId=...` |
| Area Redeem Code | Posisi terpisah (~2cm) | Ditutup scratch-off | Kode redeem rahasia + QR |

---

## 10. Git Status

```
Commit: 0de9ebf feat: sprint-5 AI scan + QR codes + purchasePrice + tokenIds array
Branch: main, synced
Working tree: clean
```

---

## 11. Known Issues

1. **`/api/scan` timeout** — Blockchain RPC calls bisa timeout di Vercel serverless. Perlu caching atau retry logic jika sering terjadi.

2. **AI Vision belum diimplementasi** — Task opsional, fallback ke QR lookup saja sudah cukup untuk hackathon.

3. **purchasePrice hanya untuk kartu yang di-mint via `/api/mint`** — Kartu yang di-mint langsung via smart contract (tanpa melalui API) tidak punya purchasePrice.

---

## 12. Sprint Berikutnya — Sprint 6 (26–30 Agustus)

**Goal**: Stabilisasi, bukan fitur baru.

**Tasks:**
- Bug fixing dari fitur yang sudah dibangun
- Mentor review khusus logika vault/redeem
- Draft pitch deck
- Rekam video backup satu siklus redeem

---

*Laporan ini disusun untuk review Sprint 5.*
