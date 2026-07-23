# Laporan Sprint 5 — Final (AI Vision Di-skip)
**Tanggal**: 23 Juli 2026
**Status**: SELESAI
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Sprint 5 mengimplementasikan fitur AI Scan (QR + metadata lookup). AI Vision di-skip karena Gemini API quota issues — QR lookup saja sudah memenuhi requirement hackathon "AI x Web3".

---

## 2. Status Task

| Task | Status | Catatan |
|---|---|---|
| QR code generation | Done | `lib/qr.ts` + `/api/cards/:tokenId/qr` |
| Scan API (cache-based) | Done | `/api/scan` baca dari MongoDB |
| Scan page | Done | `/scan` dengan verification flag |
| QR di CardItem | Done | "Show QR" button |
| purchasePrice | Done | Dari mint transaction |
| tokenIds array | Done | Populate saat konfirmasi |
| card-artwork-guideline | Done | QR info-scan terpisah dari redeem |
| AI Vision | **Di-skip** | Gemini API quota issues |

---

## 3. Perubahan Teknis

### 3.1 Scan Endpoint — Cache-Based (Fix Timeout)

**Sebelum:** `/api/scan` panggil ethers.js langsung ke BNB Testnet RPC → timeout di Vercel (10s).

**Sesudah:** Baca dari MongoDB cache. `confirmTransaction()` update cache saat transaksi dikonfirmasi.

```
confirmTransaction() → update cards: { rarity, lastOwner, lastOnChainSync }
/api/scan → findOne({ tokenId }) from MongoDB → <1 detik response
```

### 3.2 QR Code System

- `lib/qr.ts` — generate QR PNG buffer
- `/api/cards/:tokenId/qr` — return QR image
- QR berisi URL `/scan?tokenId=...`
- CardItem: tombol "Show QR" menampilkan QR 128x128

### 3.3 Scan Page UI

- Card image + rarity colors
- Verification flag: ✅ Verified / ⚠️ Warning
- Metadata: tokenId, name, rarity, status, lastOwner, purchasePrice
- History: list transaksi (type, status, timestamp)
- Manual input: field untuk masukkan tokenId

---

## 4. API Endpoints (12)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/auth/google` | POST | Login Google |
| `/api/health` | GET | Cek MongoDB |
| `/api/mint` | POST | Buy pack (8 kartu, 500 Credit) |
| `/api/print` | POST | Request print |
| `/api/print/checkout` | POST | Print payment |
| `/api/redeem` | POST | Redeem card |
| `/api/transactions` | GET | Tx status polling |
| `/api/seed-templates` | POST | Seed card_templates |
| `/api/credits` | GET | Check balance |
| `/api/credits/topup` | POST | Top-up credit |
| `/api/cards` | GET | User's cards |
| `/api/cards/:tokenId/qr` | GET | QR code image |
| `/api/scan` | GET | Card metadata + verification |

---

## 5. Git Commits

```
0652e51 fix: scan endpoint reads from MongoDB cache, not ethers.js RPC
9b32619 feat: AI vision integration with Gemini API + blockchain retry logic
0de9ebf feat: sprint-5 AI scan + QR codes + purchasePrice + tokenIds array
f946676 fix: decode CardStatusChanged event data correctly
8c4975f feat: pack economy 8 cards/500 Credit + mintBatch + event sync
```

---

## 6. Known Issues

1. **AI Vision di-skip** — Gemini API quota issues, butuh key dari AI Studio
2. **`lastSync` null untuk kartu lama** — kartu yang di-mint sebelum caching tidak punya data
3. **`purchasePrice` null untuk kartu lama** — sama, perlu re-sync

---

## 7. Sprint 6 Preview

**Goal**: Stabilisasi + pitch deck (26–30 Agustus 2026)

**Tasks:**
- Bug fixing
- Mentor review logika vault/redeem
- Draft pitch deck
- Rekam video backup siklus redeem

---

*Laporan ini disusun untuk review Sprint 5 final.*
