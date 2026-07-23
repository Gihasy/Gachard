# Laporan Pack Economy — 8 Kartu per Pack
**Tanggal**: 23 Juli 2026
**Kontrak**: `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8`
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan

Perubahan ekonomi pack dari 1 kartu/$2.99 menjadi 8 kartu/500 Credit, dengan jaminan minimal 1 kartu Rare+. Smart contract ditambah fungsi `mintBatch()` atomik. Known gap (status print tidak sync ke Vaulted) juga diperbaiki.

---

## 2. Perubahan yang Diterapkan

### 2.1 Smart Contract — `mintBatch()`

**File:** `contracts/src/GachardCard.sol`

```solidity
function mintBatch(address to, uint8[] calldata rarities) external onlyOwner returns (uint256[] memory tokenIds) {
    uint256 count = rarities.length;
    require(count > 0, "Empty rarities array");

    tokenIds = new uint256[](count);
    uint256[] memory amounts = new uint256[](count);

    for (uint256 i = 0; i < count; i++) {
        require(rarities[i] <= 3, "Invalid rarity");
        uint256 tokenId = nextTokenId++;
        tokenIds[i] = tokenId;
        amounts[i] = 1;
        cardStatus[tokenId] = CardStatus.Digital;
        cardRarity[tokenId] = Rarity(rarities[i]);
        lastOwner[tokenId] = to;
    }

    _mintBatch(to, tokenIds, amounts, "");

    for (uint256 i = 0; i < count; i++) {
        emit CardMinted(tokenIds[i], to, CardStatus.Digital, Rarity(rarities[i]));
    }
}
```

**Key points:**
- Atomik — semua atau tidak sama sekali
- `_mintBatch()` dari OpenZeppelin ERC1155
- Event `CardMinted` di-emit untuk setiap token (urutan sesuai array)
- `require(count > 0)` — tolak array kosong
- `require(rarities[i] <= 3)` — tolak rarity invalid

**Tests:** 7 test baru ditambah (total 31/31 pass)

| Test | Deskripsi | Gas |
|---|---|---|
| `test_mintBatch_creates_sequential_tokens` | Token ID sequential | 230,399 |
| `test_mintBatch_stores_rarity_per_token` | Rarity tersimpan benar per token | 313,749 |
| `test_mintBatch_sets_all_tokens_to_digital` | Semua token Digital, balance=1 | 242,786 |
| `test_mintBatch_emits_events_in_order` | Event ter-emit sesuai urutan array | 163,250 |
| `test_mintBatch_reverts_on_invalid_rarity` | Revert jika rarity > 3 | 51,094 |
| `test_mintBatch_only_owner` | Hanya owner bisa panggil | 18,492 |
| `test_mintBatch_empty_array_reverts` | Revert jika array kosong | 16,721 |

---

### 2.2 Pack Odds — `lib/odds.ts`

**3 fungsi:**

| Fungsi | Fungsi |
|---|---|
| `pickRarity()` | Weighted random dari odds table normal (70/20/8/2) |
| `pickGuaranteedRareOrBetter()` | Weighted random HANYA Rare/Epic/Legendary (20/8/2 → 100%) |
| `buildPackRarities()` | Generate array 8 rarity: 7 random + 1 guaranteed Rare+, lalu shuffle |

**Algoritma `buildPackRarities()`:**
```
1. Loop 7x → pickRarity() → push ke array
2. 1x → pickGuaranteedRareOrBetter() → push ke array
3. Fisher-Yates shuffle array
4. Return array 8 rarity
```

**Shuffle** memastikan slot jaminan tidak selalu di posisi yang sama.

---

### 2.3 `/api/mint` — Pack Purchase

**Perubahan:**
- `PACK_PRICE_CENTS = 500` (500 Credit, bukan $5.00)
- `buildPackRarities()` → array 8 rarity
- `pickCardTemplate(rarity)` untuk setiap kartu → array 8 template
- `mintBatch(walletAddress, rarities)` → 1 txHash
- Insert 8 card records ke MongoDB dengan `pickIndex` (0-7)
- Refund 500 Credit penuh jika `mintBatch()` gagal

**Response:**
```json
{
  "status": "pending",
  "txId": "...",
  "txHash": "0x...",
  "cards": [
    {"rarity": 0, "template": {"templateId": "common-1", "name": "Common Card A", "artworkUrl": "/cards/common-1.png"}},
    {"rarity": 0, "template": {"templateId": "common-2", "name": "Common Card B", "artworkUrl": "/cards/common-2.png"}},
    ...
    {"rarity": 3, "template": {"templateId": "legendary-2", "name": "Legendary Card B", "artworkUrl": "/cards/legendary-2.png"}}
  ],
  "newBalance": 1201
}
```

---

### 2.4 Event Sync — Fix Known Gap

**`confirmTransaction()` di `lib/transactions.ts`:**

| Type | Logika |
|---|---|
| `mint` | Loop SEMUA `CardMinted` events (jangan break setelah 1). Match by `txId` + `pickIndex`. Update `tokenId` + `status = "Digital"` |
| `print` | Decode `CardStatusChanged`. Jika `newStatus = Vaulted(1)`, update `cards.status = "Vaulted"` |
| `redeem` | Decode `CardStatusChanged`. Jika `newStatus = Digital(0)`, update `cards.status = "Digital"` + `cards.ownerAddress` |

**Event signatures:**
```typescript
const CARD_MINTED_TOPIC = ethers.id("CardMinted(uint256,address,uint8,uint8)");
const CARD_STATUS_CHANGED_TOPIC = ethers.id("CardStatusChanged(uint256,uint8,uint8)");
```

---

### 2.5 UI Updates

**`PackCard.tsx`:**
- Teks: "8 kartu random, minimal 1 dijamin Rare+"
- Harga: "500 Credit" (bukan "$5.00")

**Home page:**
- Reveal: grid 2x4 (8 kartu)
- Setiap kartu: artwork + border warna sesuai rarity
- Balance: format Credit (bukan dollar)

**TopUp page:**
- Label: "500 Credit", "1000 Credit", dst. (bukan "$5.00")

---

### 2.6 ADR-021

**Decision:** Pack berisi 8 kartu dengan jaminan minimal 1 Rare+, mint via `mintBatch()` atomik, harga 500 Credit per pack.

**Reason:** 8 kartu lebih menarik secara visual (grid 2x4), jaminan Rare+ meningkatkan kepuasan user, `mintBatch()` menghemat gas dan memastikan konsistensi.

---

## 3. Test End-to-End — Hasil Aktual

### 3.1 Top Up

| Metric | Nilai |
|---|---|
| Balance sebelum | 701 Credit |
| Top-up | 1000 Credit |
| Balance sesudah | 1701 Credit |

### 3.2 Buy Pack (500 Credit)

| Metric | Nilai |
|---|---|
| Balance sebelum | 1701 Credit |
| Pack price | 500 Credit |
| Balance sesudah | 1201 Credit |
| TxHash | `0x7172300786a64b3c01bf5381e65a3249ec32bf438b87cc7182fab6fa987030bc` |

### 3.3 8 Kartu yang Keluar

| # | Rarity | Template | Artwork | tokenId |
|---|---|---|---|---|
| 0 | Common (0) | common-2 | `/cards/common-2.png` | 1 |
| 1 | Common (0) | common-1 | `/cards/common-1.png` | 2 |
| 2 | Common (0) | common-2 | `/cards/common-2.png` | 3 |
| 3 | Common (0) | common-1 | `/cards/common-1.png` | 4 |
| 4 | Common (0) | common-2 | `/cards/common-2.png` | 5 |
| 5 | **Legendary (3)** | legendary-2 | `/cards/legendary-2.png` | 6 |
| 6 | Common (0) | common-1 | `/cards/common-1.png` | 7 |
| 7 | **Rare (1)** | rare-1 | `/cards/rare-1.png` | 8 |

**Minimal 1 Rare+:** Legendary + Rare ✓
**8 tokenId terisi:** 1-8 ✓
**8 artworkUrl terisi:** ✓

### 3.4 On-Chain Verification

| Token | Status | Rarity |
|---|---|---|
| 1 | Digital (0) | Common (0) |
| 2 | Digital (0) | Common (0) |
| 3 | Digital (0) | Common (0) |
| 4 | Digital (0) | Common (0) |
| 5 | Digital (0) | Common (0) |
| 6 | Digital (0) | **Legendary (3)** |
| 7 | Digital (0) | Common (0) |
| 8 | Digital (0) | **Rare (1)** |

---

## 4. Kontrak Aktif

| Item | Value |
|---|---|
| Address | `0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8` |
| Chain | BNB Testnet (97) |
| Explorer | https://testnet.bscscan.com/address/0xe62bc7c470eaef3fcad1816b9ac6d63d585b5ee8 |
| Fungsi | `mintCard`, `mintBatch`, `requestPrint`, `redeemCard` |
| Tests | 31/31 passing |

---

## 5. Git Status

```
Commit: 8c4975f feat: pack economy 8 cards/500 Credit + mintBatch + event sync
Branch: main, synced
```

---

*Laporan ini disusun untuk review perubahan pack economy.*
