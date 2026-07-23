# Laporan Verifikasi Pre-Sprint 5 — Print/Redeem Sync Fix
**Tanggal**: 23 Juli 2026
**Kontrak**: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Sebelum menutup Sprint 4/pack-economy, dua verifikasi dilakukan:
1. Verifikasi `confirmTransaction()` menggunakan `pickIndex` eksplisit untuk batch mint
2. Test end-to-end print + redeem pada tokenId 6 (Legendary), termasuk fix bug event decode

**Hasil:** Bug ditemukan dan diperbaiki — `CardStatusChanged` event decode salah karena `oldStatus`/`newStatus` bukan indexed parameter. Fix berhasil diverifikasi on-chain dan di MongoDB.

---

## 2. Verifikasi #1: pickIndex Matching di confirmTransaction()

**Pertanyaan:** Apakah query pencocokan log ke card record menggunakan `pickIndex` eksplisit?

**Jawaban:** Ya, sudah benar.

**Kode (line 128-129):**
```typescript
await cardsCollection.updateOne(
  { txId: tx._id.toString(), pickIndex: mintIndex },
  {
    $set: {
      tokenId,
      status: "Digital",
      updatedAt: new Date().toISOString(),
    },
  }
);
```

**Penjelasan:**
- `mintIndex` dimulai dari 0, increment setiap kali `CardMinted` event ditemukan di receipt logs
- Query menggunakan `{ txId, pickIndex: mintIndex }` — bukan mengandalkan urutan insert
- Urutan log di receipt = urutan mint di kontrak (karena Solidity sequential)
- `pickIndex` di-set saat `/api/mint` insert card records (0-7 untuk pack 8 kartu)

**Konsistensi:**
- `/api/mint` insert: `{ pickIndex: i }` (i = 0..7)
- `confirmTransaction()` query: `{ pickIndex: mintIndex }` (mintIndex = 0..7)
- Urutan log on-chain = urutan array `rarities` di kontrak

---

## 3. Verifikasi #2: Print + Redeem End-to-End (tokenId 6)

### 3.1 Request Print

| Metric | Nilai |
|---|---|
| tokenId | 6 (Legendary) |
| Checkout paymentId | `6a617e9729d4366e895964e4` |
| Print txHash | `0xb5d1fac5ca983d72957dc5be17ca7ec1fa47f21f70d632775397fdb03c289c06` |
| Tx status | `confirmed` |
| On-chain cardStatus(6) | **1 (Vaulted)** ✓ |

### 3.2 Bug Ditemukan

**Masalah:** MongoDB `cards.status` masih `Digital` padahal on-chain sudah `Vaulted`.

**Root cause:** `CardStatusChanged` event signature:
```solidity
event CardStatusChanged(uint256 indexed tokenId, CardStatus oldStatus, CardStatus newStatus);
```

- `tokenId` = indexed → ada di `topics[1]`
- `oldStatus` = NOT indexed → ada di `data` (first 32-byte word)
- `newStatus` = NOT indexed → ada di `data` (second 32-byte word)

**Kode salah (sebelum fix):**
```typescript
const newCardStatus = parseInt(log.topics[3], 16); // WRONG — topics[3] doesn't exist
```

**Kode benar (sesudah fix):**
```typescript
const data = log.data.slice(2); // remove "0x"
const newCardStatus = parseInt(data.slice(64, 128), 16); // second 32-byte word
```

### 3.3 Fix Diterapkan

**File:** `frontend/lib/transactions.ts`

**Perubahan:**
- Print handler (line 141-166): decode `log.data` untuk `newStatus`
- Redeem handler (line 167-192): decode `log.data` untuk `newStatus`
- Kedua handler sekarang konsisten dalam cara decode event

### 3.4 Redeem tokenId 6

| Metric | Nilai |
|---|---|
| Redeem code (encrypted) | `cEZ4y+DHnO8b3zyQ5PdMQPy9heepyfn3H5RdCQ+Hn+N3Mvnqo3kUPIADVBo=` |
| Redeem code (decrypted) | `vq6xcwf24ylE05o5` |
| Redeem txHash | `0xd173809b020b0d55808e1ea6830ea4a41bdb2d63f51f139f5a9be393ba3f6033` |
| Tx status | `confirmed` |
| On-chain cardStatus(6) | **0 (Digital)** ✓ |

### 3.5 MongoDB Sync Verification

| Step | On-chain | MongoDB (before fix) | MongoDB (after fix) |
|---|---|---|---|
| After print | Vaulted (1) | Digital ✗ | **Vaulted** ✓ |
| After redeem | Digital (0) | Digital (was never updated) | **Digital** ✓ |

### 3.6 UI Verification

**Sebelum fix:**
- Koleksi menampilkan status `Digital` meskipun kartu sudah di-vault
- Tombol "Request Print" muncul lagi (karena `canPrint = status === "Digital"`)

**Sesudah fix:**
- Koleksi menampilkan status `Vaulted` ✓
- Tombol "Request Print" TIDAK muncul (karena `canPrint = status === "Digital" && tokenId !== null`) ✓

---

## 4. End-to-End Flow Verified

```
User beli pack (500 Credit)
  → mintBatch() → 8 kartu (1 tx)
  → confirmTransaction() → 8 tokenId terisi (pickIndex matching)
  → Koleksi: 8 kartu dengan artwork + status Digital

User Request Print (tokenId 6)
  → checkout (simulated Stripe) → paymentId
  → requestPrint() → txHash → pending
  → confirmTransaction() → decode CardStatusChanged → status = Vaulted
  → Koleksi: status Vaulted, tombol Request Print hilang

User Redeem (tokenId 6)
  → rate-limit check (5/min)
  → hash(code) → redeemCard() → txHash → pending
  → confirmTransaction() → decode CardStatusChanged → status = Digital
  → Koleksi: status Digital, tombol Request Print muncul lagi
```

---

## 5. Commits

| Commit | Message |
|---|---|
| `8c4975f` | `feat: pack economy 8 cards/500 Credit + mintBatch + event sync` |
| `f946676` | `fix: decode CardStatusChanged event data correctly for print/redeem sync` |

---

## 6. Konfirmasi untuk Sprint 5

| Item | Status |
|---|---|
| `confirmTransaction()` pickIndex eksplisit | Verified ✓ |
| Print → Vaulted sync ke MongoDB | Fixed & verified ✓ |
| Redeem → Digital sync ke MongoDB | Fixed & verified ✓ |
| UI Koleksi status akurat | Verified ✓ |
| Tombol Request Print conditional | Verified ✓ |

**Sprint 4/pack-economy siap ditutup.** Semua known gap sudah diperbaiki.

---

*Laporan ini disusun untuk verifikasi sebelum lanjut ke Sprint 5.*
