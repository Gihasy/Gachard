---
feature: security-audit
status: complete
specs: []
plans: []
branch: feat/ai-anomaly-detection-oracle
commits: (audit-only, no code changes)
---

# Security Audit Report — Gachard Platform

**Tanggal**: 1 September 2026
**Scope**: Full-stack (smart contract + Next.js API + repo hygiene)
**Severity**: **KRITIS** — 3 kelas kerentanan ditemukan, 2 di antaranya aktif dan bisa dieksploitasi sekarang

---

## Executive Summary

Gachard memiliki **3 masalah keamanan sistemik** yang harus diperbaiki sebelum mainnet:

1. **Mass IDOR** — 19 endpoint API tidak punya server-side auth. Siapa pun bisa operasi sebagai user mana pun.
2. **Secrets bocor di git** — 10+ file tracked berisi credential plaintext (MongoDB, admin, API keys, private key).
3. **Smart contract vulnerabilities** — 2 Critical + 2 High pada GachardCard.sol (duplikasi token, kartu permanen terkunci, pencurian kartu).

**Urutan prioritas fix**: IDOR (P0) → Secrets cleanup (P1) → Smart contract (P2).

---

## 1. Mass IDOR — 19 Endpoint Vulnerable

### Root Cause

Tidak ada mekanisme server-side session. Setelah login (Google OAuth / Demo), aplikasi hanya menyimpan `userId` di `localStorage` dan cookie `gachard_uid` (plain, unsigned). Setiap API route membaca `userId` dari request body/query **tanpa verifikasi identitas caller**.

**Middleware (`middleware.ts`)** hanya cover:
- `/api/admin/*` → HTTP Basic Auth (cukup aman)
- `/collection`, `/profile`, `/topup` → cek keberadaan cookie (bukan validitas)

**Semua route `/api/*` lainnya: nol proteksi.**

### Daftar Endpoint yang Vulnerable

#### CRITICAL (5 endpoint — dampak finansial langsung)

| Endpoint | File | Attacker bisa... |
|----------|------|------------------|
| `POST /api/credits/topup` | `app/api/credits/topup/route.ts` | Tambah credits ke akun mana pun (hingga $1,000 per request) |
| `POST /api/mint` | `app/api/mint/route.ts` | Habiskan credits user lain dengan mint paksa |
| `POST /api/dismantle` | `app/api/dismantle/route.ts` | Hancurkan kartu user lain, curi Crystal-nya |
| `POST /api/marketplace/listings` | `app/api/marketplace/listings/route.ts` | Jual kartu user lain dengan harga semau attacker |
| `POST /api/marketplace/listings/[id]/buy` | `app/api/marketplace/listings/[id]/buy/route.ts` | Beli listing pakai Crystal user lain |

#### HIGH (8 endpoint — manipulasi aset/data)

| Endpoint | File | Attacker bisa... |
|----------|------|------------------|
| `GET /api/cards?userId=X` | `app/api/cards/route.ts` | Baca seluruh koleksi kartu siapa pun |
| `GET /api/transactions?userId=X` | `app/api/transactions/route.ts` | Baca riwayat transaksi lengkap siapa pun |
| `GET /api/transactions?txId=X` | `app/api/transactions/route.ts` | Baca detail transaksi individual |
| `POST /api/print` | `app/api/print/route.ts` | Trigger print fisik untuk kartu siapa pun |
| `POST /api/print/checkout` | `app/api/print/checkout/route.ts` | Kirim alamat fiktif untuk kartu orang |
| `POST /api/redeem` | `app/api/redeem/route.ts` | Redeem kartu fisik milik orang lain |
| `POST /api/claim-shipping` | `app/api/claim-shipping/route.ts` | Tandai kartu "Real" tanpa pengiriman |
| `POST /api/marketplace/listings/[id]/cancel` | `app/api/marketplace/listings/[id]/cancel/route.ts` | Batalkan listing marketplace siapa pun |

#### MEDIUM (4 endpoint — information disclosure)

| Endpoint | File | Attacker bisa... |
|----------|------|------------------|
| `GET /api/credits?userId=X` | `app/api/credits/route.ts` | Lihat saldo kredit siapa pun |
| `GET /api/crystal?userId=X` | `app/api/crystal/route.ts` | Lihat saldo Crystal siapa pun |
| `POST /api/cards/view` | `app/api/cards/view/route.ts` | Hapus badge "New" kartu orang |
| `GET /api/scan?cardId=X` | `app/api/scan/route.ts` | Enumerate data kartu + ownership history |

#### LOW (2 endpoint)

| Endpoint | File | Attacker bisa... |
|----------|------|------------------|
| `POST /api/marketplace/wishlist-stats` | `app/api/marketplace/wishlist-stats/route.ts` | Manipulasi wishlist count |
| `GET /api/cards/[tokenId]/qr` | `app/api/cards/[tokenId]/qr/route.ts` | Generate QR code kartu mana pun |

### Skenario Exploit: Steal All Victim's Assets

```
1. Attacker login sebagai diri sendiri → dapat user_id "attacker_123"
2. Attacker temukan victim's user_id:
   - Dari marketplace listing (sellerId visible)
   - Enumerate MongoDB ObjectId
   - Social engineering
3. POST /api/dismantle { userId: "victim_456", cardId: "card_789" }
   → Server: "OK, victim's card burned, Crystal → victim's balance"
4. POST /api/marketplace/listings { userId: "victim_456", cardId: "card_012", price: 1 }
   → Victim's kartu di-list harga 1 Crystal
5. POST /api/marketplace/listings/[id]/buy { userId: "attacker_123" }
   → Attacker beli dengan Crystal sendiri
6. RESULT: Attacker dapat kartu victim dengan harga 1 Crystal
```

### Mengapa IDOR Lebih Mendesak dari Smart Contract

- IDOR mempengaruhi **SEMUA 19 endpoint sekaligus** — satu fix (server-side session) menutup semuanya
- Smart contract hanya mempengaruhi fitur print/redeem — bisa di-mitigate dengan tidak menjalankan print sampai fix
- IDOR bisa dieksploitasi **sekarang** oleh siapa pun yang tahu userId korban
- Smart contract butuh beberapa kondisi khusus (C-2 harus terjadi dulu untuk C-1)

### Fix yang Direkomendasikan

1. Buat `lib/session.ts` — HMAC-signed session token disimpan di httpOnly cookie
2. Buat `getAuthenticatedUser(req)` helper — satu fungsi untuk semua route
3. Update `middleware.ts` — extend matcher ke `/api/*`
4. Update semua 19 route — ganti trust `userId` dari request dengan `getAuthenticatedUser()`

---

## 2. Secrets Bocor di Git

### Status `.env` Files: AMAN

Semua `.env`, `.env.local`, `.env.production` sudah di-gitignore dan tidak ter-track. Source code bersih — semua baca dari `process.env.*`.

### TAPI: 10+ File Tracked Berisi Secrets Plaintext

| # | File (TER-COMMIT) | Secret yang Bocor | Severity |
|---|---|---|---|
| 1 | `frontend/scripts/assign-card-ids.mjs:4` | MongoDB connection string + password | CRITICAL |
| 2 | `frontend/scripts/clean-state.mjs:3` | MongoDB connection string + password | CRITICAL |
| 3 | `docs/PRIORITY_FIXES_REPORT.md:14-15,38` | Admin credentials (lama + baru) | HIGH |
| 4 | `docs/compose/reports/2026-08-25-session-report.md:140` | Admin username + password | HIGH |
| 5 | `docs/compose/reports/blockchain-abstraction-admin-print-real.md:116` | Admin credentials lama | HIGH |
| 6 | `docs/compose/reports/sprint-5-vision-report.md:112` | **Gemini API Key (full, tidak ter-mask)** | HIGH |
| 7 | `docs/compose/reports/2026-08-20-trade-marketplace-report.md:444` | `ENCRYPTION_SECRET_KEY` di URL query param | CRITICAL |
| 8 | `docs/SESSION_CHANGELOG.md:305-311` | Private key, Google OAuth, semua API key (partial) | HIGH |
| 9 | `memory/test_credentials.md:49` | Admin dev credentials | MEDIUM |
| 10 | `MEMORY.md:82` | Admin credentials lama | MEDIUM |

### Inventory Secret yang Ter-expose

| Secret | Status | Dampak jika di-abuse |
|--------|--------|---------------------|
| MongoDB Atlas connection string + password | Ter-commit di 2 file | Full database access (baca/tulis/hapus semua collection) |
| Admin Basic Auth (2 pasang) | Ter-commit di 4+ file | Akses admin panel, clean-slate database |
| Gemini API Key (full) | Ter-commit di 1 file | Abuse API quota, billing ke akun kamu |
| `ENCRYPTION_SECRET_KEY` | Ter-commit di 1 file (URL) + partial di SESSION_CHANGELOG | Dekripsi semua private key ter-encrypt di DB |
| Admin wallet private key | Partial (`0xf77d...`) di SESSION_CHANGELOG | Jika full key bocor: kontrol penuh atas admin wallet |
| Google OAuth Client ID + Secret | Partial di SESSION_CHANGELOG | OAuth impersonation jika full key bocor |

### Gap di `.gitignore`

`docs/`, `memory/`, `MEMORY.md` **tidak di-gitignore** — ini penyebab utama secrets bocor.

### Fix yang Direkomendasikan

| Prioritas | Action |
|-----------|--------|
| **P0** | **Rotate SEMUA credentials**: MongoDB password, admin password, Google OAuth secret, Gemini API key, encryption key, wallet private key |
| **P0** | Hapus hardcoded MongoDB URL dari `assign-card-ids.mjs` dan `clean-state.mjs` → ganti dengan `process.env.MONGODB_URL` |
| **P1** | Scrub secrets dari semua tracked files (10+ file) |
| **P1** | Tambah `docs/`, `memory/`, `MEMORY.md` ke `.gitignore` atau sanitize content |
| **P2** | Rewrite git history dengan `git filter-repo` / BFG Repo-Cleaner untuk purge secrets dari commit history |

---

## 3. Smart Contract Vulnerabilities

### File: `contracts/src/GachardCard.sol` (200 lines)

---

### C-1 (CRITICAL): `redeemCard()` — Duplicate Token Minting

**Vulnerable code** (lines 113-134):
```solidity
function redeemCard(uint256 tokenId, bytes32 redeemHash, address recipientAddress) external {
    // ...
    address previousOwner = lastOwner[tokenId];          // line 118
    // ...
    _update(previousOwner, recipientAddress, ids, values); // line 131
}
```

**Root cause**: Jika `lastOwner[tokenId] == address(0)`, maka `_update(address(0), recipient, ...)` di ERC1155 diinterpretasikan sebagai **MINT** (bukan transfer). Token baru dibuat tanpa menghapus yang lama.

**Skenario exploit langkah-demi-langkah**:

1. Admin mint Legendary card ke user1 → `tokenId=5`, `balanceOf(user1, 5) = 1`
2. Backend panggil `requestPrint(5, hash, address(0))` ← dimungkinkan oleh C-2
3. `lastOwner[5] = address(0)`, card jadi Vaulted, tapi user1 masih pegang token
4. Attacker tahu redeem code (foto kartu fisik / social engineering / brute-force)
5. Attacker panggil `redeemCard(5, hash, attacker_address)` ← H-1: tidak ada onlyOwner
6. `_update(address(0), attacker, [5], [1])` → ERC1155 lihat `from == address(0)` → **MINT**
7. **Hasil**: `balanceOf(attacker, 5) = 1` DAN `balanceOf(user1, 5) = 1` — **DUPLIKAT!**

**Impact**: Kartu Legendary diduplikasi on-chain. Attacker bisa jual duplikatnya. Invariant satu-token-per-instance (ADR-001) rusak total.

---

### C-2 (CRITICAL): `requestPrint()` — No ownerAddress Validation

**Vulnerable code** (lines 90-104):
```solidity
function requestPrint(uint256 tokenId, bytes32 redeemHash, address ownerAddress) external onlyOwner {
    require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
    lastOwner[tokenId] = ownerAddress;  // ← TIDAK ADA VALIDASI!
    // ...
}
```

**Root cause**: Tidak ada `require(ownerAddress != address(0))` dan tidak ada `require(balanceOf(ownerAddress, tokenId) == 1)`.

**Skenario dampak**:

| Skenario | Trigger | Akibat |
|----------|---------|--------|
| A: `address(0)` | Backend bug (null wallet dari DB) | Memicu C-1 → duplikat token |
| B: Wrong owner | Backend lookup user salah | `lastOwner` salah → card **permanen terkunci** di Vaulted |
| C: Stale owner (H-2) | Card di-transfer via `safeTransferFrom`, lalu print | `lastOwner` masih pemilik lama → card permanen terkunci |

**Impact**: Card bisa jadi permanen tidak bisa di-redeem. Tidak ada recovery path di kontrak.

---

### H-1 (HIGH): `redeemCard()` Permissionless

```solidity
function redeemCard(...) external {  // ← TIDAK ADA onlyOwner!
```

Semua fungsi lain (`requestPrint`, `marketplaceTransfer`, `burnCard`) punya `onlyOwner`. Tapi `redeemCard` bisa dipanggil **siapa saja** dari wallet mana pun. Rate limiting, session auth, semua proteksi backend bisa di-bypass total.

**Exploit**: Attacker foto kartu fisik milik korban → panggil `redeemCard()` langsung on-chain → kartu dicuri dari pemilik sah.

---

### H-2 (HIGH): `lastOwner` Stale on ERC1155 Transfers

`_update()` override (lines 187-199) tidak update `lastOwner` saat transfer standar ERC1155. Hanya `marketplaceTransfer()` yang update. Jika card di-transfer via `safeTransferFrom` lalu di-print, `lastOwner` salah → card permanen terkunci.

---

### Interdependensi Vulnerability

```
C-2 (no validation) ──enables──→ C-1 (duplicate mint)
       │
       └──+ H-2 (stale lastOwner) ──→ Card permanen terkunci

H-1 (permissionless) ──amplifies──→ Semua di atas bisa dieksploitasi oleh publik
```

### Fix yang Direkomendasikan

| ID | Fix | Kode |
|----|-----|------|
| C-2 | Tambah `require(ownerAddress != address(0))` dan `require(balanceOf(ownerAddress, tokenId) == 1)` di `requestPrint()` | `GachardCard.sol:90` |
| C-1 | Fix C-2 sudah cukup menutup C-1 (tidak bisa lagi `lastOwner == address(0)`) | — |
| H-1 | Tambah `onlyOwner` modifier ke `redeemCard()` | `GachardCard.sol:113` |
| H-2 | Update `lastOwner[tokenId] = to` di `_update()` override ketika `from != address(0) && to != address(0)` | `GachardCard.sol:198` |

**Catatan**: Semua fix butuh **redeploy contract**. Card yang sudah ada di contract lama (`0x16df46a0c9ee8a5e82d53557e4aff373052b383f`) harus di-migrate atau dianggap legacy.

---

## 4. Bug Minor: `getDisplayStatus()`

**File**: `frontend/app/api/cards/route.ts:9-15`

Function hanya cek `fulfillmentStatus`, sehingga kartu dengan `status: "Burned"` tapi `fulfillmentStatus: null` masih tampil sebagai "Digital" di UI.

**Fix**: Tambah `if (card.status === "Burned") return "Burned"` sebelum logic fulfillment.

---

## Rekomendasi Prioritas Eksekusi

| Prioritas | Task | Estimasi | Alasan |
|-----------|------|----------|--------|
| **P0** | Server-side session (tutup 19 IDOR endpoint) | 1-2 sesi | Dampak paling luas, bisa dieksploitasi sekarang |
| **P0** | Rotate semua credentials | 30 menit | Secrets sudah di git history, harus dianggap compromised |
| **P1** | Scrub secrets dari tracked files + update .gitignore | 1 sesi | Mencegah kebocoran berkelanjutan |
| **P2** | Smart contract fixes (C-1, C-2, H-1, H-2) + redeploy | 1 sesi | Butuh Foundry test update + deploy |
| **P3** | Fix `getDisplayStatus()` bug | 15 menit | Minor, user-facing |

---

## Kesimpulan

Gachard dalam kondisi **aman untuk hackathon demo** (attacker perlu tahu userId + teknis blockchain), tapi **TIDAK aman untuk production/mainnet**. Tiga kelas kerentanan ini harus diperbaiki berurutan: IDOR dulu (dampak terluas), lalu secrets cleanup, lalu smart contract.

**Catatan untuk hackathon**: Jika waktu terbatas, P0 (IDOR fix) adalah satu-satunya yang benar-benar wajib sebelum demo publik. Smart contract bisa di-mitigate sementara dengan tidak menjalankan fitur print/redeem sampai fix selesai.
