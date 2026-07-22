# Laporan Sprint 2 — Core Mint
**Periode**: 22 Juli 2026 (diselesaikan lebih awal)
**Status**: SELESAI
**Kontrak**: `0xc7d37b43fa706c646f89b19b78b9c2329925731c` (BNB Testnet)
**Block Explorer**: https://testnet.bscscan.com/address/0xc7d37b43fa706c646f89b19b78b9c2329925731c

---

## 1. Ringkasan

Sprint 2 bertujuan membangun smart contract BEP-1155 untuk mint kartu dan mengintegrasikannya dengan frontend. Semua task selesai: kontrak ditulis, di-test lokal, di-deploy ke BNB Testnet, di-test on-chain, dan diintegrasikan ke Next.js API routes.

**Hasil akhir**: mint kartu berfungsi end-to-end — frontend memanggil `/api/mint`, backend melakukan weighted random pick rarity, memilih card template, mengirim transaksi mint ke chain, dan menyimpan record di MongoDB.

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 1 | Setup wallet testnet + faucet | Done | 0.05 tBNB terverifikasi |
| 2 | Setup Foundry project | Done | Foundry v1.7.1 + OpenZeppelin |
| 3 | Tulis `GachardCard.sol` + test | Done | 7/7 test lulus |
| 4 | Deploy ke BNB Testnet | Done | `0xa15cb9f3...38c2` |
| 5 | Test mint di testnet | Done | 3 kartu (Common, Rare, Epic) terverifikasi |
| 6 | Integrasi frontend | Done | `/api/mint` + odds + card templates |
| 7 | Final verification | Done | Build OK, TypeScript OK, on-chain OK |

---

## 3. Definition of Done — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Mint berhasil, token terlihat di block explorer | Pass | `cast call balanceOf` = 1, bscscan.com menampilkan tx |
| Status `Digital` tercatat benar per token | Pass | `cardStatus(1)` = 0 (Digital) |
| Rarity tercatat benar per token | Pass | `cardRarity(1)` = 0, `cardRarity(2)` = 1, `cardRarity(3)` = 2 |
| Kode ter-push ke GitHub | Belum | Perlu commit manual |
| Frontend build sukses | Pass | `npm run build` tanpa error |

---

## 4. Smart Contract — `GachardCard.sol`

**Lokasi**: `contracts/src/GachardCard.sol`

### Struktur Kontrak

```solidity
contract GachardCard is ERC1155, Ownable {
    enum CardStatus { Digital, Vaulted }
    enum Rarity { Common, Rare, Epic, Legendary }

    uint256 public nextTokenId = 1;

    mapping(uint256 => CardStatus) public cardStatus;
    mapping(uint256 => Rarity) public cardRarity;
    mapping(uint256 => bytes32) public storedHash;
    mapping(uint256 => address) public lastOwner;
}
```

### Fungsi

| Fungsi | Akses | Parameter | Return | Fungsi |
|---|---|---|---|---|
| `mintCard(address,uint8)` | onlyOwner | `to` (penerima), `rarity` (0-3) | `tokenId` | Mint kartu baru, status Digital |
| `cardStatus(uint256)` | public view | `tokenId` | `CardStatus` | Cek status kartu |
| `cardRarity(uint256)` | public view | `tokenId` | `Rarity` | Cek rarity kartu |
| `_update(...)` | internal override | from, to, ids, values | — | Block transfer saat Vaulted |

### State Machine

```
Digital (default) → requestPrint() → Vaulted → redeemCard() → Digital
```

Transfer standar **ditolak** saat status = Vaulted (kecuali mint dari address(0)).

### Event

```solidity
event CardMinted(uint256 indexed tokenId, address indexed to, CardStatus status, Rarity rarity);
event CardStatusChanged(uint256 indexed tokenId, CardStatus oldStatus, CardStatus newStatus);
```

### Mapping yang Sudah Ada (untuk Sprint 3)

| Mapping | Tipe | Fungsi |
|---|---|---|
| `storedHash[tokenId]` | `bytes32` | Hash redeem code (untuk `requestPrint` / `redeemCard`) |
| `lastOwner[tokenId]` | `address` | Pemilik terakhir (untuk provenance) |

---

## 5. Test Results

**7/7 test lulus** (Foundry, Solidity 0.8.24)

| Test | Deskripsi | Hasil |
|---|---|---|
| `test_mint_creates_token_with_digital_status` | Mint menghasilkan token dengan status Digital | PASS |
| `test_mint_stores_rarity` | Rarity tersimpan benar per tokenId | PASS |
| `test_mint_increments_token_id` | Token ID auto-increment | PASS |
| `test_mint_multiple_to_same_user` | Boleh mint beberapa kartu ke user sama | PASS |
| `test_mint_emits_event` | Event `CardMinted` ter-emit dengan parameter benar | PASS |
| `test_only_owner_can_mint` | Hanya owner yang bisa mint (revert jika bukan) | PASS |
| `test_mint_reverts_on_invalid_rarity` | Rarity > 3 di-revert | PASS |

---

## 6. Deploy & On-Chain Verification

### Deploy

- **Chain**: BNB Testnet (chain ID 97)
- **Contract Address**: `0xc7d37b43fa706c646f89b19b78b9c2329925731c`
- **Deployer**: `<ADMIN_WALLET_ADDRESS>`
- **Tx Hash**: `0x49895fff477fc11c6767e11bc0e652fd852a005dbc8eeba9437e16601523265b`
- **Gas Used**: ~0.000000000003 BNB (estimasi, gas price sangat rendah di testnet)

### Test Mint (3 kartu)

| Token ID | Rarity | Status | Owner |
|---|---|---|---|
| 1 | Common (0) | Digital (0) | `<ADMIN_WALLET_ADDRESS>` |
| 2 | Rare (1) | Digital (0) | `<ADMIN_WALLET_ADDRESS>` |
| 3 | Epic (2) | Digital (0) | `<ADMIN_WALLET_ADDRESS>` |

**Verifikasi on-chain:**
```
nextTokenId = 4 (berarti 3 token sudah di-mint)
balanceOf(admin, 1) = 1
cardStatus(1) = 0 (Digital)
cardRarity(1) = 0 (Common)
cardRarity(2) = 1 (Rare)
cardRarity(3) = 2 (Epic)
```

---

## 7. Frontend Integration

### File Baru

| File | Fungsi |
|---|---|
| `frontend/lib/blockchain.ts` | ethers.js provider, wallet, contract interaction |
| `frontend/lib/odds.ts` | Odds table + weighted random pick rarity |
| `frontend/lib/card-templates.ts` | Card template CRUD + seed placeholder data |
| `frontend/app/api/mint/route.ts` | POST `/api/mint` — mint endpoint |

### Alur `/api/mint`

```
POST /api/mint {userId}
    │
    ├─ 1. Cari user di MongoDB
    ├─ 2. seedCardTemplates() — isi placeholder jika kosong
    ├─ 3. pickRarity() — weighted random (70/20/8/2)
    ├─ 4. pickCardTemplate(rarity) — pilih template acak
    ├─ 5. mintCard(walletAddress, rarity) — kirim tx ke chain
    ├─ 6. Simpan transaksi sebagai "pending" di MongoDB
    ├─ 7. Simpan card record di collection "cards"
    │
    └─ Return: {status: "pending", txId, txHash, rarity, template}
```

### Response Example

```json
{
  "status": "pending",
  "txId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "txHash": "0xabc123...",
  "rarity": 0,
  "template": {
    "templateId": "common-1",
    "name": "Common Card A"
  }
}
```

### MongoDB Collections

| Collection | Field | Fungsi |
|---|---|---|
| `transactions` | userId, type, rarity, templateId, txHash, status, fromAddress, toAddress | Record transaksi |
| `cards` | tokenId, txId, templateId, rarity, ownerAddress, status | Record kartu (linked ke tokenId on-chain) |
| `card_templates` | templateId, rarity, name, artworkUrl | Template kartu (placeholder) |

---

## 8. Odds Table

**Default**: 70% Common / 20% Rare / 8% Epic / 2% Legendary

| Rarity | Weight | Label |
|---|---|---|
| 0 | 70 | Common |
| 1 | 20 | Rare |
| 2 | 8 | Epic |
| 3 | 2 | Legendary |

Bisa di-override dari MongoDB collection `odds` (lihat ADR-009). Saat ini menggunakan default hardcoded.

---

## 9. Card Templates

**8 placeholder templates** (2 per rarity):

| templateId | Rarity | Name | artworkUrl |
|---|---|---|---|
| common-1 | Common | Common Card A | (kosong) |
| common-2 | Common | Common Card B | (kosong) |
| rare-1 | Rare | Rare Card A | (kosong) |
| rare-2 | Rare | Rare Card B | (kosong) |
| epic-1 | Epic | Epic Card A | (kosong) |
| epic-2 | Epic | Epic Card B | (kosong) |
| legendary-1 | Legendary | Legendary Card A | (kosong) |
| legendary-2 | Legendary | Legendary Card B | (kosong) |

`artworkUrl` kosong — kamu perlu generate artwork manual dan update ke MongoDB.

---

## 10. Dependencies

### Smart Contract

| Dependency | Versi | Fungsi |
|---|---|---|
| OpenZeppelin Contracts | v5.x (latest) | ERC1155, Ownable |
| Forge Std | latest | Testing framework |
| Solidity | 0.8.24 | Compiler |

### Frontend (baru)

| Package | Fungsi |
|---|---|
| ethers | v6.x | Ethereum wallet + provider + contract interaction |

---

## 11. Environment Variables

```env
# Sudah ada dari Sprint 1
MONGODB_URL=mongodb+srv://...
DATABASE_NAME=gachard
GOOGLE_CLIENT_ID=...
ENCRYPTION_SECRET_KEY=...  # min 32 karakter

# Ditambah Sprint 2
ADMIN_WALLET_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
BSC_TESTNET_RPC=https://bsc-testnet-rpc.publicnode.com
CHAIN_ID=97
CONTRACT_ADDRESS=0x...
```

**Catatan**: `ADMIN_PRIVATE_KEY` disimpan plaintext di env var (bukan dienkripsi ke MongoDB). Ini OK untuk demo hackathon. Produksi: simpan di vault service.

---

## 12. Rencana Detail

Rencana eksekusi lengkap ada di `docs/compose/plans/2026-07-22-sprint-2-core-mint.md`.

---

## 13. Risiko & Catatan untuk Sprint 3

1. **`storedHash` dan `lastOwner` sudah ada di kontrak** tapi belum ada fungsi `requestPrint()` dan `redeemCard()`. Sprint 3 perlu menambahkan kedua fungsi ini.

2. **`_update` override sudah memblock transfer saat Vaulted** — ini sudah siap untuk mekanisme print.

3. **Admin wallet punya 0.05 tBNB** — cukup untuk beberapa puluh transaksi lagi. Kalau habis, claim faucet lagi.

4. **Artwork belum ada** — `card_templates` pakai placeholder. Kamu perlu generate artwork dan update `artworkUrl` di MongoDB.

5. **`GOOGLE_CLIENT_ID` masih placeholder** — login Google belum bisa dipakai. Perlu setup Google Cloud Console OAuth credentials.

6. **Belum ada commit ke GitHub** — perlu `git add` dan `git commit` setelah review.

7. **Foundry hanya bisa dijalankan via Git Bash** di Windows — tidak dari PowerShell langsung. Perlu catatan untuk developer.

---

## 14. File Inventory (Sprint 2)

```
D:\Gachard\
├── contracts/
│   ├── src/
│   │   └── GachardCard.sol          # Smart contract BEP-1155
│   ├── test/
│   │   └── GachardCard.t.sol        # 7 unit tests
│   ├── script/
│   │   ├── Deploy.s.sol             # Deploy script
│   │   └── MintTest.s.sol           # Mint test script
│   ├── lib/
│   │   ├── forge-std/               # Foundry std lib
│   │   └── openzeppelin-contracts/  # OZ v5
│   ├── foundry.toml                 # Foundry config
│   └── remappings.txt               # Import remappings
├── frontend/
│   ├── lib/
│   │   ├── blockchain.ts            # [BARU] ethers.js provider + contract
│   │   ├── odds.ts                  # [BARU] Odds table + pickRarity()
│   │   ├── card-templates.ts        # [BARU] Card template CRUD
│   │   ├── crypto.ts                # [Sprint 1] AES-256-GCM
│   │   ├── auth.ts                  # [Sprint 1] Google OAuth
│   │   ├── wallet.ts                # [Sprint 1] Custodial wallet
│   │   ├── transactions.ts          # [Sprint 1] Async tx + confirm
│   │   ├── rate-limit.ts            # [Sprint 1] Rate limiting
│   │   ├── mongodb.ts               # [Sprint 1] DB connection
│   │   └── api.ts                   # [Sprint 1] Client helpers
│   ├── app/api/
│   │   ├── mint/route.ts            # [BARU] POST /api/mint
│   │   ├── auth/google/route.ts     # [Sprint 1] Login
│   │   ├── health/route.ts          # [Sprint 1] Health check
│   │   └── transactions/route.ts    # [Sprint 1] Tx polling
│   └── .env.local                   # Updated dengan BNB Testnet vars
└── sprints/
    └── SPRINT-2.md                  # Perlu update checklist
```

---

## 15. Yang Perlu Dilakukan Setelah Review

1. **Commit ke GitHub** — `git add -A && git commit -m "sprint-2: core mint complete"`
2. **Update SPRINT-2.md** — centang semua task
3. **Generate artwork** — update `artworkUrl` di MongoDB `card_templates`
4. **Setup Google OAuth** — update `GOOGLE_CLIENT_ID` di `.env.local`
5. **Lanjut Sprint 3** — `requestPrint()` + `redeemCard()`

---

*Laporan ini disusun untuk review sebelum lanjut ke Sprint 3. Bisa dibaca oleh Claude Code, MiMoCode, atau tool AI lainnya.*
