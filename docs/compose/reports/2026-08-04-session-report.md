# Laporan Sesi — 4 Agustus 2026

**Tanggal**: 4 Agustus 2026
**Tool**: MiMoCode (mimo-v2.5-pro)
**Total Commit**: 14
**Total File Berubah**: 16 file (+981 / -458 lines)
**Deploy**: Auto via Vercel (setiap push ke main)

---

## 1. Ringkasan Eksekutif

Sesi ini mencakup 7 area perbaikan dan fitur baru, difokuskan pada **perbaikan Scan page**, **Card Detail Modal**, **konsistensi UI**, **bug fix mint flow**, **admin monitoring dashboard**, dan **clean slate untuk demo**.

| # | Area | Status |
|---|------|--------|
| 1 | Fix Scan verification false mismatch | ✅ Selesai |
| 2 | Scan Again button + top bar input | ✅ Selesai |
| 3 | Card Detail Modal (overlay) | ✅ Selesai |
| 4 | Button style unification (btn-primary) | ✅ Selesai |
| 5 | Dead endpoints/links cleanup + DB query optimization | ✅ Selesai |
| 6 | Mint flow bug fix (pending cards) | ✅ Selesai |
| 7 | Admin Health dashboard + Clean Slate | ✅ Selesai |

---

## 2. Fix Scan Verification False Mismatch

### 2.1 Root Cause

Semua kartu menampilkan "Warning — data mismatch" di halaman Scan Result karena:
- `lastOnChainSync` null untuk kartu yang di-mint sebelum sistem caching → `cacheAge = Infinity` → `cacheFresh = false`
- Ada expiry 1 jam — kartu dormant selalu gagal verifikasi meskipun data valid

### 2.2 Fix

**File**: `frontend/app/api/scan/route.ts`

Hapus pengecekan cache freshness. Data di MongoDB sudah terkonfirmasi on-chain (diupdate saat mint/print/redeem dikonfirmasi), jadi cukup cek konsistensi status:

```typescript
// Sebelum
const cacheAge = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
const cacheFresh = cacheAge < 3600000;
const verified = cacheFresh && card.status !== undefined;

// Sesudah
const statusMatch = STATUS_LABELS[statusCode] === card.status || card.status === "Real";
const verificationFlag = card.status !== undefined && statusMatch ? "verified" : "warning";
```

---

## 3. Scan Again Button + Top Bar Input

### 3.1 Perubahan

**File**: `frontend/app/scan/page.tsx`

| Fitur | Detail |
|-------|--------|
| **Scan bar di atas** | Input Card ID + tombol Scan + icon kamera, muncul di bawah judul Scan Result |
| **Input Card ID** | Field `#` + placeholder "Enter Card ID…" + tombol "Scan" (btn-primary) |
| **Icon kamera** | Tombol kecil di kanan, cukup icon saja, buka QRScanner |
| **Tombol lama dihapus** | "Scan Another Card" di bawah hasil dihapus |

---

## 4. Card Detail Modal (Overlay)

### 4.1 Masalah

User harus navigasi ke halaman `/scan` untuk melihat detail kartu. Tidak praktis untuk browsing collection.

### 4.2 Solusi

Buat modal overlay yang fetch data dari `/api/scan` dan tampilkan info lengkap tanpa meninggalkan halaman.

**File baru**: `frontend/components/CardDetailModal.tsx`

| Fitur | Detail |
|-------|--------|
| **Trigger** | Klik area gambar kartu di CardItem (Profile & Collection page) |
| **Data** | Fetch dari `/api/scan?cardId=...` |
| **Layout** | 2 kolom: gambar kartu (150px fixed) + info detail |
| **Verification** | Badge verified/warning |
| **Metadata** | Card ID, Name, Rarity, Status, Last Owner, Purchase Price |
| **Transaction History** | 3 riwayat terakhir + tombol expand "+N more" dengan arrow |
| **Close** | Tombol X, klik backdrop, tekan Escape |
| **Hover effect** | Gambar kartu zoom-in + overlay "View Details" |

### 4.3 Ukuran Kartu

| Perubahan | Sebelum | Sesudah |
|-----------|---------|---------|
| Card width | 200px | **150px** |
| Max height modal | `max-h-[90vh]` | `min(88vh, 600px)` |
| Header padding | `p-5` | `px-5 py-3` |
| Body padding | `p-5` | `p-4` |
| Text sizes | `text-xs` | `text-[0.65rem]` / `text-[0.55rem]` |

### 4.4 Fix Desktop Border Stretching

Container kartu ditambah `self-start` untuk mencegah glow/border rarity memanjang mengikuti tinggi kolom metadata.

---

## 5. Button Style Unification

### 5.1 Tombol yang Diubah ke `btn-primary`

| File | Tombol | Perubahan |
|------|--------|-----------|
| `app/scan/page.tsx` | "Open Camera" (landing) | `btn-primary w-full` |
| `app/scan/page.tsx` | "Scan" (top bar) | `btn-primary` |
| `app/scan/page.tsx` | "Scan" (error retry) | `btn-primary` |
| `app/scan/page.tsx` | Camera icon (top bar) | `btn-primary !p-2.5` |
| `app/scan/page.tsx` | Camera icon (error retry) | `btn-primary !px-4` |
| `components/CardItem.tsx` | "Pay $14.99 & Print" | `btn-primary w-full` |

---

## 6. Dead Endpoints/Links Cleanup + DB Query Optimization

### 6.1 Dead Endpoints

| Action | Detail |
|--------|--------|
| **Hapus** `/api/admin/accept-print` | Sudah digantikan `/api/admin/fulfillment`. Endpoint lama bisa buat state tidak konsisten |
| **Protect** `/api/seed-templates` | Sekarang wajib pakai admin credentials (Basic Auth) |

### 6.2 Dead Buttons/Links

| File | Perubahan |
|------|-----------|
| `marketplace/page.tsx` | Hapus tombol "Join Waitlist" + link "Back to Home" |
| `login/page.tsx` | Terms of Service & Privacy Policy jadi plain text |
| `Footer.tsx` | Hapus kolom Company & Resources (dead links), social media links, subscribe form. Simpan hanya Product links |

### 6.3 Query Performance

| File | Sebelum | Sesudah |
|------|---------|---------|
| `api/scan/route.ts` | `usersCollection.find({}).toArray()` | Filter `$in` by relevant addresses only |
| `api/transactions/route.ts` | `cardsCollection.find({}).toArray()` | Filter `$in` by tokenIds dari transaksi user |
| `api/admin/cards/route.ts` | `usersCollection.find({}).toArray()` | Filter `$in` by owner addresses dari kartu |

---

## 7. Mint Flow Bug Fix (Pending Cards)

### 7.1 Root Cause

`mintBatch()` langsung return `tx.hash` tanpa menunggu transaksi di-mined. Auto-confirm mencoba `getTransactionReceipt(txHash)` langsung tapi receipt belum tersedia di BNB testnet → timeout → kartu tetap `status: "pending"`.

### 7.2 Fix Iterasi

| Commit | Fix |
|--------|-----|
| `4267349` | `mintBatch` tunggu receipt dengan `tx.wait()` → timeout (terlalu lama) |
| `1bdc798` | Ganti ke `waitForReceipt()` polling dengan retry |
| `849ef25` | Kurangi polling ke 3x (1s, 2s, 3s) = max 6s agar muat dalam 15s limit |

### 7.3 Final Flow

```
mintBatch() → submit tx, return hash langsung (~3s)
    ↓
Insert cards ke DB dengan status: "pending"
    ↓
waitForReceipt(txHash, 3, 1000) → poll 1s, 2s, 3s
    ↓
Receipt masuk → parse CardMinted events → update cards ke "Digital"
    ↓
Return "confirmed" atau "pending"
```

### 7.4 Auto-Reconciliation

**File**: `frontend/app/api/cards/route.ts`

Setiap kali user fetch kartu (Collection/Profile page), cek kartu pending → `confirmTransaction()` otomatis:

```
GET /api/cards?userId=...
    ↓
Ada card.status === "pending"?
    ↓ Ya
confirmTransaction(txId) → cek on-chain receipt
    ↓
Receipt ada? → update ke "Digital" + assign tokenId
    ↓
Return cards (sudah di-update)
```

### 7.5 `waitForReceipt()` Function

**File**: `frontend/lib/blockchain.ts`

```typescript
export async function waitForReceipt(
  txHash: string,
  maxRetries = 6,
  baseDelayMs = 1500
): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) return receipt;
    } catch {
      // Provider error — retry
    }
    await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
  }
  return null;
}
```

---

## 8. Admin Health Dashboard

### 8.1 Endpoint: `GET /api/admin/pending-cards`

**File**: `frontend/app/api/admin/pending-cards/route.ts`

Response:
```json
{
  "total": 3,
  "staleCount": 1,
  "avgPendingMinutes": 5,
  "cards": [
    {
      "cardId": "a3f1b",
      "tokenId": null,
      "templateId": "common-1",
      "rarity": "Common",
      "ownerUsername": "@user1",
      "txHash": "0xabc...",
      "txStatus": "confirmed",
      "pendingDuration": "12m",
      "pendingMs": 720000,
      "isStale": true
    }
  ]
}
```

### 8.2 Dashboard: Tab "Health" di `/admin`

**File**: `frontend/app/admin/page.tsx`

| Fitur | Detail |
|-------|--------|
| **Summary card** | "Pending Mints" count dengan notifikasi merah jika ada stale |
| **Summary bar** | Pending Cards count, Stale count (>1m), Avg Pending duration |
| **Tabel** | Card ID, Template, Rarity, Owner, Tx Status, Pending Duration, Created |
| **Warna durasi** | Biru (<1m), Kuning (1-5m), Merah (>5m) |
| **Highlight** | Baris stale cards dapat background merah transparan |
| **Confirm All** | Tombol untuk paksa confirm semua pending transaksi |
| **Empty state** | Centang biru + "No pending cards — all mints confirmed" |

---

## 9. Clean Slate

Database dibersihkan untuk persiapan Demo Day:

| Collection | Sebelum | Sesudah |
|------------|---------|---------|
| cards | 75 | **0** |
| transactions | 22 | **0** |
| redeem_codes | 4 | **0** |
| rate_limits | 1 | **0** |
| shipping_addresses | 4 | **0** |
| payments | 4 | **0** |
| users | 7 | 7 (kept) |
| card_templates | 8 | 8 (kept) |
| Demo1-3 credits | — | **0** |

---

## 10. Commit History

| # | Commit | Message |
|---|--------|---------|
| 1 | `bd8d132` | fix: scan verification false mismatch + add Scan Another Card button |
| 2 | `4212b41` | feat: move scan bar to top of result with input + camera icon |
| 3 | `23afa76` | feat: unify button styles to match btn-primary gradient |
| 4 | `c44cc79` | feat: clickable card artwork navigates to scan result with hover effect |
| 5 | `4f29c3f` | feat: card detail overlay modal on click instead of page navigation |
| 6 | `3430d00` | fix: constrain card size in modal + show 3 history items with expand toggle |
| 7 | `098eacd` | fix: compact card detail modal to fit viewport without scrollbar |
| 8 | `f4da9ee` | fix: card border stretching on desktop — add self-start |
| 9 | `11502ba` | fix: remove dead endpoints, dead links, optimize DB queries |
| 10 | `4267349` | fix: mint auto-confirm — wait for receipt in mintBatch to prevent pending cards |
| 11 | `1bdc798` | fix: mint timeout — use receipt polling instead of blocking tx.wait() |
| 12 | `849ef25` | fix: reduce mint receipt polling to fit within 15s Vercel timeout |
| 13 | `d63b980` | feat: auto-reconcile pending cards when user views collection |
| 14 | `279cb88` | feat: admin Health tab — monitor pending cards with duration + confirm all |

---

## 11. Open Items

| Item | Priority | Status |
|------|----------|--------|
| AI Vision (Gemini) | **Critical** | DITUNDA — WAJIB sebelum submission final |
| DNS gachard.com | Medium | Belum dikonfigurasi di registrar |
| Demo Day prep | High | Video, pitch deck, rehearsal |

---

*Laporan ini mencakup semua perubahan sesi 4 Agustus 2026 dari commit `bd8d132` hingga `279cb88`.*
