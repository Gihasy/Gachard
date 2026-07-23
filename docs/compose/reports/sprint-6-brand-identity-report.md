# Laporan Sprint 6 + Brand Identity Implementation
**Tanggal**: 23 Juli 2026
**Status**: SELESAI
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Sprint 6 menyelesaikan stabilisasi core loop dan pitch deck outline. Setelah itu, implementasi brand identity Gachard (8 tasks) diterapkan ke seluruh UI. Semua sudah di-commit dan di-push ke GitHub.

---

## 2. Sprint 6 — Stabilisasi & Pitch Deck

### 2.1 Task Status

| Task | Status | Catatan |
|---|---|---|
| Audit core loop | Done | Semua endpoint berfungsi, 31/31 contract tests pass |
| Draft pitch deck | Done | 9-slide outline di `docs/pitch-deck-outline.md` |
| Final deploy | Done | Vercel production |

### 2.2 Core Loop Audit Results

| Endpoint | Status | Response |
|---|---|---|
| `/api/health` | OK | `{"status":"ok","database":"connected"}` |
| `/api/credits?userId=...` | OK | `{"balance":1201}` |
| `/api/scan?tokenId=6` | OK | Rarity=Legendary, status=Digital, history=2 tx |
| `/api/cards/:tokenId/qr` | OK | 200 PNG |
| `/api/cards?userId=...` | OK | 9 kartu dengan artworkUrl |

### 2.3 Smart Contract Tests

```
31/31 tests passing
- mintCard: 7 tests
- mintBatch: 7 tests
- requestPrint: 7 tests
- redeemCard: 6 tests
- full loop: 4 tests
```

### 2.4 Pitch Deck Outline

9 slides:
1. Title — logo + tagline
2. Problem — grading mahal, digital tidak terverifikasi
3. Solution — kartu digital-native, lock-vault-redeem
4. Demo Flow — login → buy pack → reveal → print → scan
5. Architecture — Next.js + MongoDB + BNB Testnet
6. AI Integration — QR scan + verification
7. Differentiator — vs Courtyard
8. Roadmap — hackathon → post-hackathon
9. Ask — mentor feedback, partnership, komunitas

---

## 3. Brand Identity Implementation

### 3.1 Design Source

File: `D:\Gachard Project\aab624a2-d8ef-4397-80b5-091ae1d819cf.png`

### 3.2 Color Palette

| Nama | Hex | Penggunaan |
|---|---|---|
| Deep Navy | `#0B0E1A` | Background utama |
| Cosmic Violet | `#B8ACFF` | Primary accent, card borders, glow |
| Aurora Pink | `#FF6BBA` | CTA buttons, highlights |
| Electric Blue | `#00CCFF` | Secondary accent, glow effects |
| Aurora Gold | `#FFC466` | Tagline, premium elements, stats |
| Silver Mist | `#E6E8F0` | Body text, icon strokes |

### 3.3 CSS Classes

| Class | Fungsi |
|---|---|
| `.btn-cta` | Gradient pink→blue, pill shape, white text |
| `.btn-secondary` | Transparent + white border, pill shape |
| `.btn-gold` | Aurora Gold background, dark text |
| `.card-surface` | Dark background, glassmorphism, rounded corners |
| `.tag` | Pill-shaped badge |
| `.tag-rare/epic/legendary` | Rarity-colored tags |
| `.glow-rare/epic/legendary` | Rarity glow effects |

### 3.4 Task Status

| Task | File | Status |
|---|---|---|
| 1. CSS Variables | `globals.css` | Done |
| 2. Navbar | `Navbar.tsx` | Done |
| 3. Home page | `page.tsx` | Done |
| 4. PackCard | `PackCard.tsx` | Done |
| 5. CardItem | `CardItem.tsx` | Done |
| 6. TopUp page | `topup/page.tsx` | Done |
| 7. Scan page | `scan/page.tsx` | Done |
| 8. Login, Koleksi, Marketplace, Profil | Multiple files | Done |

### 3.5 Visual Changes

**Navbar:**
- Background: Deep Navy
- Logo: Cosmic Violet, uppercase "GACHARD"
- Links: Silver Mist, uppercase
- Login button: CTA gradient (pink→blue), pill shape

**Home:**
- Hero: "COLLECT. PLAY. TRADE." — besar, putih, uppercase
- Tagline: Aurora Gold
- Balance: Gold color
- Card reveal: rarity glow (Rare=blue, Epic=violet, Legendary=gold)

**CardItem:**
- Card surface: dark glassmorphism
- Rarity badge: colored tag
- Status badge: Digital=blue, Vaulted=pink
- Glow effect per rarity

**TopUp:**
- Preset buttons: cosmic violet selection, dark background
- Balance: Aurora Gold
- CTA: gradient button

**Scan:**
- Card image: rarity glow border
- Verification flag: blue (verified) / gold (warning)
- Metadata: card-surface with silver text

---

## 4. Commits (9 total)

| Commit | Message |
|---|---|
| `db1aba4` | feat: complete brand identity - Task 8 (global button styles) |
| `5251e52` | feat: complete Gachard brand identity implementation (Tasks 1-7) |
| `993364f` | feat: implement Gachard brand identity (Tasks 1-4) |
| `f55ed14` | sprint-6: stabilization + pitch deck outline |
| `0652e51` | fix: scan endpoint reads from MongoDB cache, not ethers.js RPC |
| `9b32619` | feat: AI vision integration with Gemini API + blockchain retry logic |
| `0de9ebf` | feat: sprint-5 AI scan + QR codes + purchasePrice + tokenIds array |
| `f946676` | fix: decode CardStatusChanged event data correctly |
| `8c4975f` | feat: pack economy 8 cards/500 Credit + mintBatch + event sync |

---

## 5. Project Status Summary

### 5.1 Infrastructure

| Item | Value |
|---|---|
| Deploy | https://frontend-rosy-pi-88.vercel.app |
| GitHub | https://github.com/Gihasy/Gachard |
| Smart Contract | `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8` (BNB Testnet) |
| Database | MongoDB Atlas (free tier) |
| Admin Wallet | `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa` |

### 5.2 Routes

**Pages (8):** Home, Login, Top Up, Koleksi, Scan, Marketplace, Profil

**API Routes (12):** auth/google, health, mint, print, print/checkout, redeem, transactions, seed-templates, credits, credits/topup, cards, cards/[tokenId]/qr, scan

### 5.3 Smart Contract

| Fungsi | Status |
|---|---|
| `mintCard(address, uint8)` | Aktif |
| `mintBatch(address, uint8[])` | Aktif |
| `requestPrint(uint256, bytes32, address)` | Aktif |
| `redeemCard(uint256, bytes32, address)` | Aktif |
| Tests | 31/31 passing |

### 5.4 Libraries (13)

mongodb, wallet, auth, crypto, api, blockchain, odds, card-templates, transactions, rate-limit, redeem-code, credits, qr, vision

### 5.5 MongoDB Collections (9)

users, transactions, cards, card_templates, odds, rate_limits, redeem_codes, credits, payments

---

## 6. Known Issues

1. **AI Vision di-skip** — Gemini API quota issues, butuh key dari AI Studio
2. **`lastSync` null** — kartu lama tidak punya cached on-chain data
3. **`purchasePrice` null** — kartu lama tidak punya purchasePrice

---

## 7. Yang Perlu Dilakukan

1. **Rekam video backup** siklus mint→print→redeem
2. **Buat pitch deck** dari outline di `docs/pitch-deck-outline.md`
3. **Rehearsal** 3-4 hari sebelum Demo Day
4. **Cek tanggal Demo Day** di grup peserta hackathon

---

*Laporan ini disusun untuk review Sprint 6 + Brand Identity.*
