# Gachard — Pitch Deck Outline
**Untuk**: Indonesia Web3 Hackathon 2026 — Demo Day

---

## Slide 1: Title
- **Logo Gachard**
- **Tagline**: "Digital-to-Physical TCG Platform"
- **Track**: Consumer Apps — Indonesia Web3 Hackathon 2026
- **Chain**: BNB Chain

---

## Slide 2: Problem

**Kolektor kartu fisik menghadapi 2 masalah utama:**

1. **Grading otentikasi mahal** — PSA biaya $50-200/kartu, waktu tunggu 3-6 bulan
2. **Kartu digital tidak punya bukti keaslian** — sulit dibuktikan otentik, sulit ditelusuri riwayat kepemilikan

---

## Slide 3: Solution

**Gachard: kartu digital-native sejak lahir**

- Brand/IP menerbitkan kartu digital (NFT tersembunyi di balik UX biasa)
- User beli pack → reveal kartu → koleksi
- Request print → kartu terkunci di vault (bukan burn)
- Redeem → kartu kembali ke digital dengan kode rahasia

**Blockchain 100% tersembunyi dari user.**

---

## Slide 4: Demo Flow

1. **Login** → Google OAuth, wallet custodial otomatis
2. **Top Up** → 500 Credit
3. **Buy Pack** → 8 kartu reveal (minimal 1 Rare+)
4. **Koleksi** → lihat kartu dengan artwork + rarity
5. **Request Print** → kartu terkunci di vault
6. **Scan QR** → metadata lengkap + verification flag

---

## Slide 5: Architecture

```
Vercel (single service)
├── Next.js 16 API Routes (backend)
├── MongoDB Atlas (database)
└── BNB Testnet (smart contract)
```

- **Smart Contract**: BEP-1155, 31/31 tests passing
- **Enkripsi**: AES-256-GCM untuk private key + redeem code
- **Rate-limiting**: 5 attempt/menit per user

---

## Slide 6: AI Integration

**QR Scan + Verification:**
- Scan QR code → metadata lengkap (rarity, status, owner, history)
- Verification flag: ✅ Verified / ⚠️ Warning
- **(Roadmap)** AI Vision analysis untuk deteksi anomali

---

## Slide 7: Differentiator

| | Gachard | Courtyard |
|---|---|---|
| **Kartu** | Digital-native sejak lahir | Tokenisasi kartu fisik yang sudah ada |
| **Blockchain** | Tersembunyi dari user | User harus tahu crypto |
| **Print** | Lock di vault (bukan burn) | Burn + remint |
| **AI** | QR scan + verification | Tidak ada |

---

## Slide 8: Roadmap

**Hackathon (saat ini):**
- Core loop: mint → vault → redeem
- QR scan + verification
- 8 kartu per pack, 4 rarity

**Post-hackathon:**
- Marketplace fungsional
- Multi-brand licensing
- Produksi fisik dengan MPG
- AI Vision analysis

---

## Slide 9: Ask

1. **Mentor feedback** — logika vault/redeem, keamanan smart contract
2. **Partnership** — brand/IP yang tertarik menerbitkan kartu
3. **Komunitas** — kolektor kartu yang ingin beta test

---

*Outline ini untuk persiapan pitch deck final.*
