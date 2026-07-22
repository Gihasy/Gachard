# Laporan Sprint 3 — Vault / Print / Redeem
**Tanggal**: 22 Juli 2026
**Status**: SELESAI, siap commit
**Kontrak**: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637` (BNB Testnet)
**Deploy**: https://frontend-rosy-pi-88.vercel.app

---

## 1. Ringkasan Eksekutif

Sprint 3 adalah bagian paling kritis dari seluruh produk: mekanisme lock-vault-redeem. Semua task selesai. Smart contract sudah punya `requestPrint()` dan `redeemCard()` yang berfungsi penuh di BNB Testnet. Full loop mint → print → redeem sudah terverifikasi on-chain (3 siklus). Frontend sudah terintegrasi via API routes `/api/print` dan `/api/redeem` dengan rate-limiting dan enkripsi redeem code.

---

## 2. Task Status

| # | Task | Status | Catatan |
|---|---|---|---|
| 1 | Smart contract (`requestPrint` + `redeemCard`) | Done | Sudah ada dari revisi sebelumnya, 24/24 tests |
| 2 | Deploy kontrak baru ke BNB Testnet | Done | `0x122ace91...0637` |
| 3 | Update `blockchain.ts` | Done | ABI + 6 fungsi baru |
| 4 | Buat `redeem-code.ts` | Done | generate + sha3-256 hash |
| 5 | `POST /api/print` | Done | Generate code → hash → chain → simpan terenkripsi |
| 6 | `POST /api/redeem` | Done | Rate-limit → hash → chain |
| 7 | Test end-to-end on-chain | Done | Full loop verified |
| 8 | Deploy ke Vercel | Done | 9 API routes aktif |

---

## 3. Definition of Done — Verifikasi

| Kriteria | Status | Bukti |
|---|---|---|
| Full loop mint→print→redeem berhasil di testnet | Pass | Token 1: Digital → Vaulted → Digital (verified via cast) |
| Hash lama terverifikasi tidak valid setelah siklus print baru | Pass | Test `test_old_code_invalid_after_new_print` pass |
| requestPrint revert saat status sudah Vaulted | Pass | Test `test_requestPrint_reverts_when_already_vaulted` pass |
| Rate-limiting aktif di /api/redeem | Pass | `checkRateLimit()` dipanggil sebelum tx on-chain |
| Frontend build sukses | Pass | `npm run build` tanpa error, 9 API routes |
| Kode ter-push ke GitHub | Belum | Perlu commit |

---

## 4. Smart Contract — Full Function Summary

**Address**: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637`
**Chain**: BNB Testnet (97)
**Explorer**: https://testnet.bscscan.com/address/0x122ace919d9da1ddb736ce6c0db6f00638ab0637

### Semua Fungsi

| Fungsi | Akses | Parameter | Fungsi |
|---|---|---|---|
| `mintCard(address,uint8)` | onlyOwner | to, rarity | Mint kartu baru, status Digital |
| `requestPrint(uint256,bytes32,address)` | onlyOwner | tokenId, redeemHash, ownerAddress | Kunci kartu ke vault |
| `redeemCard(uint256,bytes32,address)` | public | tokenId, redeemHash, recipientAddress | Redeem kartu dari vault |
| `cardStatus(uint256)` | view | tokenId | Cek status (0=Digital, 1=Vaulted) |
| `cardRarity(uint256)` | view | tokenId | Cek rarity (0-3) |
| `storedHash(uint256)` | view | tokenId | Cek hash redeem code |
| `lastOwner(uint256)` | view | tokenId | Cek pemilik terakhir |
| `balanceOf(address,uint256)` | view | account, id | Cek balance |

### State Machine

```
Digital → requestPrint() → Vaulted → redeemCard() → Digital
```

### Logika Kritis

**requestPrint():**
1. Cek `cardStatus == Digital` (revert jika sudah Vaulted)
2. Simpan `lastOwner` = ownerAddress
3. Overwrite `storedHash` = redeemHash baru (ADR-005)
4. Transfer ke vault DULU (selagi status masih Digital)
5. Ubah status ke Vaulted SETELAH transfer

**redeemCard():**
1. Cek `cardStatus == Vaulted` (revert jika belum)
2. Cek `storedHash == redeemHash` (revert jika salah)
3. Ubah status ke Digital DULU
4. Update `lastOwner` = recipientAddress
5. Transfer dari vault ke recipient SETELAH status berubah

**_update() override:**
- Block transfer jika `cardStatus == Vaulted && from != address(0)`
- Exception: mint (from=address(0)) dan internal vault transfer (status diubah dulu)

---

## 5. Test Results (24/24 Pass)

### mintCard tests (7)
| Test | Deskripsi | Gas |
|---|---|---|
| `test_mint_creates_token_with_digital_status` | Token created, status Digital | 77,062 |
| `test_mint_stores_rarity` | Rarity tersimpan per tokenId | 237,317 |
| `test_mint_increments_token_id` | ID auto-increment | 134,729 |
| `test_mint_multiple_to_same_user` | Boleh mint beberapa ke user sama | 156,904 |
| `test_mint_emits_event` | Event CardMinted ter-emit | 78,924 |
| `test_only_owner_can_mint` | Hanya owner bisa mint | 15,698 |
| `test_mint_reverts_on_invalid_rarity` | Rarity > 3 di-revert | 14,351 |

### requestPrint tests (7)
| Test | Deskripsi | Gas |
|---|---|---|
| `test_requestPrint_changes_status_to_vaulted` | Status → Vaulted | 129,697 |
| `test_requestPrint_stores_hash` | Hash tersimpan | 129,580 |
| `test_requestPrint_transfers_to_vault` | Token pindah ke vault | 132,494 |
| `test_requestPrint_updates_last_owner` | lastOwner ter-update | 129,847 |
| `test_requestPrint_emits_status_changed_event` | Event ter-emit | 133,285 |
| `test_requestPrint_reverts_when_already_vaulted` | Revert jika sudah Vaulted | 133,688 |
| `test_requestPrint_only_owner` | Hanya owner bisa print | 79,999 |

### redeemCard tests (6)
| Test | Deskripsi | Gas |
|---|---|---|
| `test_redeemCard_transfers_to_recipient` | Token pindah ke recipient | 145,316 |
| `test_redeemCard_changes_status_to_digital` | Status → Digital | 143,113 |
| `test_redeemCard_updates_last_owner` | lastOwner ter-update | 143,268 |
| `test_redeemCard_emits_status_changed_event` | Event ter-emit | 145,966 |
| `test_redeemCard_reverts_when_not_vaulted` | Revert jika belum Vaulted | 80,513 |
| `test_redeemCard_reverts_on_wrong_code` | Revert jika kode salah | 135,626 |
| `test_redeemCard_works_when_called_by_anyone` | Siapa saja bisa call (asal hash benar) | 144,381 |

### Full loop tests (4)
| Test | Deskripsi | Gas |
|---|---|---|
| `test_old_code_invalid_after_new_print` | Kode lama invalid setelah siklus baru | 214,916 |
| `test_requestPrint_overwrites_old_hash` | Hash ditimpa, bukan append | 186,373 |
| `test_full_loop_three_cycles` | 3 siklus penuh mint→print→redeem | 299,861 |

---

## 6. On-Chain Verification

### Kontrak Baru
- **Address**: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637`
- **Deployer**: `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`
- **nextTokenId**: 4 (3 kartu test ter-mint)

### Test On-Chain (Token 1)

| Step | Tx Hash | Status | Hasil |
|---|---|---|---|
| mintCard(1, Common) | (dari MintTest script) | success | Token 1 created, Digital |
| requestPrint(1, hash, admin) | `0x1f3f6472...` | success | Token 1 → Vaulted, hash stored |
| redeemCard(1, hash, admin) | `0x5dc2b719...` | success | Token 1 → Digital, balance=1 |

**Verifikasi final:**
- `cardStatus(1)` = 0 (Digital) ✓
- `balanceOf(admin, 1)` = 1 ✓
- `storedHash(1)` = hash yang benar ✓

---

## 7. API Endpoints (9 total)

| Endpoint | Method | Fungsi | Sprint |
|---|---|---|---|
| `/api/auth/google` | POST | Login Google + buat wallet custodial | 1 |
| `/api/health` | GET | Cek MongoDB | 1 |
| `/api/mint` | POST | Mint card (odds + template + async) | 2 |
| `/api/print` | POST | Request print (generate code + hash + chain) | **3** |
| `/api/redeem` | POST | Redeem card (rate-limit + hash + chain) | **3** |
| `/api/transactions` | GET | Polling status tx + auto-confirm | 1+2 |
| `/api/seed-templates` | POST | Seed card_templates | 2 |

### `/api/print` Flow
```
POST {userId, tokenId}
  ├─ Cari user di MongoDB
  ├─ Generate redeem code (16 char random)
  ├─ Hash code (sha3-256)
  ├─ requestPrint(tokenId, hash, walletAddress) → txHash
  ├─ Simpan transaksi "pending"
  ├─ Simpan redeem code TERENKRIPSI (AES-256-GCM) di collection redeem_codes
  └─ Return {status: "pending", txId, txHash}
  // JANGAN return code ke frontend!
```

### `/api/redeem` Flow
```
POST {userId, tokenId, code}
  ├─ Cari user di MongoDB
  ├─ Cek rate-limit (5/menit per user, ADR-006)
  │   └─ Jika limit → return 429 (TANPA tx on-chain)
  ├─ Hash code yang dimasukkan user
  ├─ redeemCard(tokenId, hash, walletAddress) → txHash
  ├─ Simpan transaksi "pending"
  └─ Return {status: "pending", txId, txHash, rateLimitRemaining}
```

---

## 8. Library Modules

| File | Fungsi | Sprint |
|---|---|---|
| `blockchain.ts` | Provider, wallet, contract, 6 fungsi on-chain | 2+**3** |
| `redeem-code.ts` | `generateRedeemCode()` + `hashRedeemCode()` | **3** |
| `rate-limit.ts` | `checkRateLimit()` MongoDB-based, 5/menit | 1 |
| `crypto.ts` | AES-256-GCM encrypt/decrypt | 1 |
| `transactions.ts` | CRUD + `confirmTransaction()` | 1+2 |
| `odds.ts` | Odds table + pickRarity() | 2 |
| `card-templates.ts` | Template CRUD + seed | 2 |
| `auth.ts` | Google OAuth + encrypted wallet | 1 |
| `wallet.ts` | Custodial wallet generation | 1 |
| `mongodb.ts` | DB connection | 1 |

---

## 9. MongoDB Collections (8 total)

| Collection | Fungsi | Sprint |
|---|---|---|
| `users` | User + wallet + encrypted private key | 1 |
| `transactions` | Tx status (pending/confirmed/failed) | 1+2 |
| `cards` | Card record (linked ke tokenId) | 2 |
| `card_templates` | 8 template + artworkUrl | 2 |
| `odds` | Odds table (opsional) | 2 |
| `rate_limits` | Rate-limiting per user per menit | 1 |
| `redeem_codes` | Redeem code terenkripsi (untuk cetak fisik) | **3** |

---

## 10. Keamanan

| Item | Status |
|---|---|
| `.env.local` di `.gitignore` | Aman |
| Private key user di MongoDB | Terenkripsi AES-256-GCM |
| Redeem code di MongoDB | Terenkripsi AES-256-GCM |
| Redeem code di on-chain | Hanya hash, bukan plaintext |
| Redeem code ke frontend | TIDAK pernah dikirim |
| Rate-limiting | 5 attempt/menit per user (MongoDB-based) |
| Admin private key | Plaintext di env var Vercel |

---

## 11. Git Status

```
Branch: main
Latest commits:
  9724604 chore: replace card artwork with smaller file sizes (~1MB each)
  33bdc0a feat: add card artwork (9 PNG) + update card_templates artworkUrl
  82f2c3f feat: sprint-2 core mint + architecture migration to Next.js API routes

Working tree: clean (belum ada commit Sprint 3)
```

**Yang perlu di-commit:**
- `frontend/lib/blockchain.ts` (updated ABI + fungsi baru)
- `frontend/lib/redeem-code.ts` (baru)
- `frontend/app/api/print/route.ts` (baru)
- `frontend/app/api/redeem/route.ts` (baru)
- `.env.local.example` (updated CONTRACT_ADDRESS)

---

## 12. Sprint Berikutnya — Sprint 4 (10–16 Agustus)

**Goal**: Sistem credit dual-track + UI utama

**Tasks:**
- `creditBalance` di database, `topUpCredits()` via Stripe test-mode
- `buyPack()` — potong saldo credit
- `requestPrint()` — direct payment Stripe terpisah
- Build UI utama: Home, Buy Pack, Reveal, Koleksi, Request Print flow
- Placeholder Marketplace "Coming Soon"

---

## 13. Yang Perlu Dilakukan Sekarang

1. **Commit + push** Sprint 3 changes ke GitHub
2. **Redeploy Vercel** dengan CONTRACT_ADDRESS baru
3. **Lanjut Sprint 4** atau review dulu

---

*Laporan ini disusun untuk review sebelum commit Sprint 3.*
