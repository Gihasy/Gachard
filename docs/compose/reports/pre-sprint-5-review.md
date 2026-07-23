# Laporan Pre-Sprint 5 — Perbaikan & Test End-to-End
**Tanggal**: 23 Juli 2026
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Sebelum menutup Sprint 4, 3 hal diperbaiki dan 1 test end-to-end dilakukan:
1. `/api/mint` response sekarang include `artworkUrl`
2. Semua API route konsisten pakai `ObjectId` untuk query `_id`
3. Test end-to-end sungguhan dilaporkan dengan nilai aktual

---

## 2. Perbaikan #1: artworkUrl di `/api/mint` Response

**File:** `frontend/app/api/mint/route.ts`

**Sebelum:**
```typescript
template: { templateId: template.templateId, name: template.name },
```

**Sesudah:**
```typescript
template: { templateId: template.templateId, name: template.name, artworkUrl: template.artworkUrl },
```

**Dampak:** Home page sekarang bisa menampilkan artwork kartu sungguhan setelah reveal, bukan hanya nama template.

---

## 3. Perbaikan #2: ObjectId Consistency

**Masalah:** MongoDB `_id` adalah `ObjectId`, tapi 4 API route masih query dengan string `userId` langsung — tidak akan match.

**Route yang diperbaiki:**

| Route | Sebelum | Sesudah |
|---|---|---|
| `/api/mint` | `findOne({ _id: userId })` | `findOne({ _id: new ObjectId(userId) })` |
| `/api/print` | `findOne({ _id: userId })` | `findOne({ _id: new ObjectId(userId) })` |
| `/api/print/checkout` | `findOne({ _id: userId })` | `findOne({ _id: new ObjectId(userId) })` |
| `/api/redeem` | `findOne({ _id: userId })` | `findOne({ _id: new ObjectId(userId) })` |
| `/api/cards` | Sudah benar | — |

**Konsistensi sekarang:** Semua 5 route yang query `users` by `_id` pakai `new ObjectId(userId)`.

---

## 4. Perbaikan #3: Refund Tracking di `/api/mint`

**Sebelum:** catch block selalu return "credit refunded" meskipun refund gagal.

**Sesudah:**
```typescript
catch (error) {
  let refunded = false;
  try {
    await addCredits(userId, PACK_PRICE_CENTS);
    refunded = true;
  } catch (refundError) {
    console.error("CRITICAL: Refund failed:", refundError);
  }

  const message = refunded
    ? "Mint failed, credit refunded"
    : "Mint failed, credit refund FAILED — contact support";

  return NextResponse.json({ error: message, refunded }, { status: 500 });
}
```

**Dampak:** Response sekarang akurat — `refunded: true/false` dan pesan error sesuai kenyataan.

---

## 5. Test End-to-End — Hasil Aktual

### 5.1 Setup User Test

```
User ID: 6a6177ab8e497c54bf3d7594
Wallet:  0x90590833047Ae4012c3a1c2c352Bb737126dB89A
```

### 5.2 Top Up $10

| Metric | Nilai |
|---|---|
| Balance sebelum | `$0.00` (0 cents) |
| Request | `POST /api/credits/topup {userId, amountCents: 1000}` |
| Response | `{success: true, newBalance: 1000}` |
| Balance sesudah | `$10.00` (1000 cents) |

### 5.3 Buy Pack

| Metric | Nilai |
|---|---|
| Balance sebelum | `$10.00` (1000 cents) |
| Request | `POST /api/mint {userId}` |
| Response status | `pending` |
| Response rarity | `0` (Common) |
| Response template | `common-1` — "Common Card A" |
| Response artworkUrl | `/cards/common-1.png` |
| Response newBalance | `701` cents ($7.01) |
| Balance sesudah | `$7.01` (701 cents) |
| TxHash | `0xe28ffed2677b4765d56c41bbd5fd41ac7ecf088e7098a38d428f6d180aa55c06` |

**Verifikasi:** $10.00 - $2.99 = $7.01 ✓

### 5.4 Transaction Confirmation

| Metric | Nilai |
|---|---|
| TxId | `6a6177dc1b7c0931e9459869` |
| Status sebelum | `pending` |
| Polling | `GET /api/transactions?txId=6a6177dc...` |
| Status sesudah | `confirmed` |
| tokenId extracted | `4` (dari CardMinted event log) |

**Verifikasi:** `confirmTransaction()` berhasil decode event dan update `cards.tokenId = 4` ✓

### 5.5 Koleksi

| Metric | Nilai |
|---|---|
| Request | `GET /api/cards?userId=6a6177ab...` |
| tokenId | `4` (terisi, bukan null) |
| templateId | `common-1` |
| rarity | `0` (Common) |
| status | `Digital` |
| artworkUrl | `/cards/common-1.png` |
| templateName | `Common Card A` |

**Verifikasi:** tokenId terisi dari event, artworkUrl dari card_templates join ✓

### 5.6 Request Print

| Metric | Nilai |
|---|---|
| Checkout request | `POST /api/print/checkout {userId, tokenId: 4}` |
| Checkout response | `{success: true, paymentId: "6a61782d...", amount: 999}` |
| Print request | `POST /api/print {userId, tokenId: 4, paymentId}` |
| Print response | `{status: "pending", txId: "6a617839...", txHash: "0x6f177cb2..."}` |
| Tx status polling | `confirmed` |
| On-chain cardStatus(4) | `1` (Vaulted) |

**Verifikasi:** Print berhasil, kartu terkunci di vault on-chain ✓

---

## 6. Known Gap

**Status kartu di MongoDB masih `Digital` setelah print.**

`confirmTransaction()` baru handle event `mint` (extract tokenId). Belum handle event `print` (update status ke `Vaulted`).

**On-chain:** `cardStatus(4)` = 1 (Vaulted) ✓
**MongoDB `cards.status`**: masih `Digital` ✗

**Dampak:** Koleksi page akan menampilkan status `Digital` padahal kartu sudah di-vault. Tombol "Request Print" akan muncul lagi (karena `canPrint = status === "Digital" && tokenId !== null`).

**Fix:** Tambahkan logika di `confirmTransaction()` untuk type `print` — decode `CardStatusChanged` event, update `cards.status` ke `Vaulted`.

---

## 7. Git Status

```
Commit: e02ae9a fix: consistent ObjectId handling for userId queries + artworkUrl in mint response
Branch: main, synced with origin/main
Working tree: clean
```

---

## 8. Rekomendasi

1. **Fix gap print→Vaulted** sebelum Sprint 5 (kecil, ~10 menit)
2. **Lanjut Sprint 5** — AI Scan (QR + vision)
3. **Sprint 6** — Stabilisasi + pitch deck

---

*Laporan ini disusun untuk review sebelum lanjut ke Sprint 5.*
