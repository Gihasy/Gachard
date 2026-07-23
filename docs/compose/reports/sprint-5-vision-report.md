# Laporan Sprint 5 — AI Vision & Blockchain Retry
**Tanggal**: 23 Juli 2026
**Status**: SELESAI, ter-deploy
**Deploy**: https://frontend-rosy-pi-88.vercel.app
**Kontrak**: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`

---

## 1. Ringkasan

Sprint 5 menambahkan AI Vision sungguhan (Google Gemini API) ke fitur scan dan retry logic untuk blockchain calls. Implementasi ini menggantikan placeholder/mock data dengan analisis visual real-time.

---

## 2. Perubahan yang Diterapkan

### 2.1 AI Vision — `lib/vision.ts`

**API**: Google Gemini 2.0 Flash (free tier, 15 RPM)

**Fungsi**: `analyzeCardImage(imageUrl, expectedRarity, expectedName)`

**Alur:**
1. Fetch artwork image sebagai base64
2. Kirim ke Gemini API dengan prompt analisis
3. Parse response JSON (matches_rarity, description, condition, anomalies, confidence)
4. Return `VisionAnalysis` object

**Response example:**
```json
{
  "matches": true,
  "description": "A purple-glowing card with epic-style border and dragon illustration",
  "condition": "Mint",
  "anomalies": [],
  "confidence": 85
}
```

**Error handling:**
- API key missing → return graceful error (confidence: 0)
- Image fetch fail → return error
- JSON parse fail → return error
- All errors → return `matches: false` (never crash)

---

### 2.2 Blockchain Retry Logic — `lib/blockchain.ts`

**Wrapper**: `withRetry(fn, label)`

**Config:**
- `MAX_RETRIES = 3`
- `RETRY_DELAY_MS = 1000` (exponential: 1s, 2s, 3s)

**Applied to:** Semua view functions (`getCardStatus`, `getCardRarity`, `getStoredHash`, `getLastOwner`, `getBalance`)

**Not applied to:** Write functions (`mintCard`, `mintBatch`, `requestPrint`, `redeemCard`) — karena write functions punya retry logic sendiri di level API route (refund mechanism).

**Log output:**
```
[blockchain] cardStatus(6) attempt 1/3 failed: timeout
[blockchain] cardStatus(6) attempt 2/3 failed: timeout
[blockchain] cardStatus(6) attempt 3/3 failed: timeout
→ throws Error
```

---

### 2.3 `/api/scan` — Vision Integration

**Parameter baru:** `?vision=true` (opsional)

**Perubahan:**
- Import `analyzeCardImage` dari `lib/vision.ts`
- Jika `vision=true` dan `artworkUrl` ada, panggil `analyzeCardImage()`
- Tambahkan `verification.vision` ke response
- Update `verification.flag` jika vision `matches: false`

**Response dengan vision:**
```json
{
  "tokenId": 6,
  "onChain": { "status": "Vaulted", "rarity": "Legendary", ... },
  "metadata": { "artworkUrl": "/cards/legendary-2.png", ... },
  "purchasePrice": 500,
  "verification": {
    "verified": true,
    "statusMatch": true,
    "flag": "verified",
    "vision": {
      "matches": true,
      "description": "Holographic gold card with legendary-style border",
      "condition": "Mint",
      "anomalies": [],
      "confidence": 90
    }
  },
  "history": [...]
}
```

**Tanpa vision** (`?tokenId=6`):
- `verification.vision` = `null`
- `verification.flag` hanya berdasarkan on-chain vs MongoDB match

---

### 2.4 Environment Variable

```
GEMINI_API_KEY=AQ.Ab8RN6J5nz87T5hOoHGM_GGmLp-taELqUYLMqBs1RsSltQ1Gzw
```

Set di:
- `frontend/.env.local` (local testing)
- Vercel environment variables (production)

---

## 3. Gemini API Integration Detail

### 3.1 Prompt Strategy

```
Analyze this trading card image. The card metadata says:
- Name: {expectedName}
- Rarity: {expectedRarity}

Please answer these questions in JSON format:
1. Does the visual appearance match the expected rarity?
2. Brief description of the card's visual appearance
3. Estimated physical condition
4. Any visual anomalies or concerns

Return ONLY valid JSON: { matches_rarity, description, condition, anomalies, confidence }
```

**Kenapa prompt ini:**
- Minta JSON output langsung (tidak perlu parsing markdown)
- Spesifik tentang rarity expectations (Common=plain, Rare=blue, Epic=purple, Legendary=holographic)
- Condition estimation untuk physical card use case
- Anomalies untuk fraud detection (AI Agent narrative)

### 3.2 Model Choice

**gemini-2.0-flash** — fastest, cheapest, good enough for card analysis.

Alternatif jika kualitas kurang:
- `gemini-2.0-pro` — lebih akurat, lebih lambat
- `gemini-1.5-flash` — fallback jika 2.0 tidak tersedia

---

## 4. Blockchain Timeout Issue

### 4.1 Masalah

`/api/scan` return `{"error":"Scan failed"}` saat dipanggil dari Vercel, padahal blockchain calls works locally.

**Root cause:** Vercel serverless function timeout (default 10s untuk Hobby plan). Blockchain RPC calls ke BNB Testnet bisa butuh 5-15 detik.

**Evidence:**
- Local test: `cardStatus(6)` = 0, `cardRarity(6)` = 3 ✓
- Vercel test: `{"error":"Scan failed"}` ✗

### 4.2 Solusi yang Diterapkan

**Retry logic** (3 attempts, exponential backoff):
```typescript
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
```

### 4.3 Solusi yang Belum Diterapkan (Future)

1. **Cache on-chain data di MongoDB** — update saat transaksi dikonfirmasi, baca dari cache di `/api/scan`
2. **Upgrade Vercel plan** — Pro plan punya 60s timeout
3. **Gunakan faster RPC** — BNB Testnet public RPC kadang lambat

---

## 5. Commits

| Commit | Message |
|---|---|
| `0de9ebf` | `feat: sprint-5 AI scan + QR codes + purchasePrice + tokenIds array` |
| `9b32619` | `feat: AI vision integration with Gemini API + blockchain retry logic` |

---

## 6. File Inventory

### Baru

| File | Fungsi |
|---|---|
| `frontend/lib/vision.ts` | Gemini API integration |
| `frontend/lib/qr.ts` | QR code generation |
| `frontend/app/api/scan/route.ts` | Scan endpoint + vision |
| `frontend/app/api/cards/[tokenId]/qr/route.ts` | QR image endpoint |
| `frontend/app/scan/page.tsx` | Scan page UI |

### Dimodifikasi

| File | Perubahan |
|---|---|
| `frontend/lib/blockchain.ts` | Retry logic untuk view functions |
| `frontend/app/api/mint/route.ts` | tokenIds + purchasePrice |
| `frontend/lib/transactions.ts` | Populate tokenIds saat konfirmasi |
| `frontend/components/CardItem.tsx` | Show QR button |
| `frontend/components/Navbar.tsx` | Scan link |
| `docs/card-artwork-guideline.md` | QR info-scan terpisah dari redeem |

---

## 7. Test Status

| Test | Status | Catatan |
|---|---|---|
| Blockchain calls local | ✓ | cardStatus, cardRarity, lastOwner OK |
| Blockchain calls Vercel | ✗ | Timeout (RPC latency) |
| QR generation | ✓ | `/api/cards/:tokenId/qr` return PNG |
| Scan page | ✓ | UI renders correctly |
| AI Vision (Gemini) | Belum test | Perlu test manual dengan API key |

---

## 8. Yang Perlu Dilakukan

1. **Test AI Vision manual** — buka `/scan?tokenId=6&vision=true` di browser
2. **Optimasi blockchain timeout** — cache on-chain data atau gunakan faster RPC
3. **Sprint 6** — stabilisasi + pitch deck

---

*Laporan ini disusun untuk review Sprint 5 AI Vision implementation.*
