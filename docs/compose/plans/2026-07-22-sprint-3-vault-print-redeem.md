# Sprint 3 — Vault / Print / Redeem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementasi `requestPrint()` dan `redeemCard()` di smart contract + backend, sehingga full loop mint → print → redeem berfungsi di BNB Testnet.

**Architecture:** `requestPrint()` mengunci kartu (status → Vaulted) dan menyimpan hash redeem code baru. `redeemCard()` memverifikasi kode dan mengembalikan kartu ke pemilik baru. Backend memanggil kedua fungsi ini atas nama user (gas disponsori), dengan rate-limiting untuk redeem.

**Tech Stack:** Solidity 0.8.24, Foundry, ethers.js v6, Next.js API Routes, MongoDB

## Global Constraints

- Status `Digital → Vaulted → Digital` (ADR-004)
- Hash overwrite per siklus print, bukan append (ADR-005)
- Redeem lewat backend saja, rate-limited 5 attempt/menit (ADR-006)
- `recipientAddress` eksplisit, bukan `msg.sender` (ADR-007)
- Pola async untuk blockchain tx (ADR-018)
- Rate-limiting berbasis MongoDB (ADR-019)
- Chain: BNB Testnet (97)

---

## Task 1: Update Smart Contract — Tambah `requestPrint()` dan `redeemCard()`

**Covers:** ADR-004, ADR-005, ADR-006, ADR-007, PRD §5.5

**Files:**
- Modify: `contracts/src/GachardCard.sol`
- Modify: `contracts/test/GachardCard.t.sol`

**Interfaces yang sudah ada (dari Sprint 2):**
- `cardStatus[tokenId]` → `CardStatus` (Digital/Vaulted)
- `storedHash[tokenId]` → `bytes32`
- `lastOwner[tokenId]` → `address`
- `_update()` override sudah memblock transfer saat Vaulted

**Interfaces yang ditambahkan:**
- `requestPrint(uint256 tokenId)` → mengubah status, menyimpan hash, transfer ke vault
- `redeemCard(uint256 tokenId, bytes32 hash, address recipientAddress)` → verifikasi hash, transfer ke recipient, ubah status

- [ ] **Step 1: Tulis test untuk `requestPrint()`**

Tambahkan test berikut ke `contracts/test/GachardCard.t.sol`:

```solidity
// === requestPrint tests ===

address public vault = address(0xdead);

function test_requestPrint_changes_status_to_vaulted() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode123");

    card.requestPrint(tokenId, hash);

    assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Vaulted));
}

function test_requestPrint_stores_hash() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode123");

    card.requestPrint(tokenId, hash);

    assertEq(card.storedHash(tokenId), hash);
}

function test_requestPrint_transfers_to_vault() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode123");

    card.requestPrint(tokenId, hash);

    assertEq(card.balanceOf(vault, tokenId), 1);
    assertEq(card.balanceOf(user1, tokenId), 0);
}

function test_requestPrint_updates_last_owner() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode123");

    card.requestPrint(tokenId, hash);

    assertEq(card.lastOwner(tokenId), user1);
}

function test_requestPrint_emits_status_changed_event() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode123");

    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardStatusChanged(tokenId, GachardCard.CardStatus.Digital, GachardCard.CardStatus.Vaulted);
    card.requestPrint(tokenId, hash);
}

function test_requestPrint_reverts_when_already_vaulted() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash1 = keccak256("code1");
    bytes32 hash2 = keccak256("code2");

    card.requestPrint(tokenId, hash1);

    vm.expectRevert("Card is not digital");
    card.requestPrint(tokenId, hash2);
}

function test_requestPrint_overwrites_old_hash() public {
    // Mint → print → redeem → print again (siklus ke-2)
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash1 = keccak256("code1");
    bytes32 hash2 = keccak256("code2");

    // Siklus 1
    card.requestPrint(tokenId, hash1);
    assertEq(card.storedHash(tokenId), hash1);

    // Redeem dulu supaya bisa print lagi
    card.redeemCard(tokenId, hash1, user2);
    assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));

    // Siklus 2 — hash HARUS ditimpa
    card.requestPrint(tokenId, hash2);
    assertEq(card.storedHash(tokenId), hash2);
    assertTrue(card.storedHash(tokenId) != hash1);
}

function test_requestPrint_reverts_when_not_owner() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("testcode");

    vm.prank(user2);
    vm.expectRevert("Not token owner");
    card.requestPrint(tokenId, hash);
}
```

- [ ] **Step 2: Run test — pastikan gagal**

```bash
cd contracts
forge test --match-test test_requestPrint -vvv
```

Expected: FAIL — `requestPrint` belum ada di kontrak

- [ ] **Step 3: Implementasi `requestPrint()` di kontrak**

Tambahkan ke `contracts/src/GachardCard.sol`:

```solidity
address public constant VAULT = address(0xdead);

/**
 * @notice Kunci kartu untuk cetak fisik — generate hash baru, overwrite hash lama
 * @param tokenId ID kartu yang akan di-print
 * @param redeemHash Hash dari redeem code yang baru (backend generate, kirim hash-nya saja)
 */
function requestPrint(uint256 tokenId, bytes32 redeemHash) external {
    require(cardStatus[tokenId] == CardStatus.Digital, "Card is not digital");
    require(msg.sender == ownerOf(tokenId), "Not token owner");

    // Simpan owner sebelum transfer
    lastOwner[tokenId] = msg.sender;

    // Transfer ke vault (lock, bukan burn)
    _transfer(msg.sender, VAULT, tokenId, 1, "");

    // Overwrite hash lama (ADR-005)
    storedHash[tokenId] = redeemHash;

    // Ubah status
    cardStatus[tokenId] = CardStatus.Vaulted;

    emit CardStatusChanged(tokenId, CardStatus.Digital, CardStatus.Vaulted);
}
```

Catatan: `ownerOf()` perlu ditambahkan karena ERC1155 tidak punya `ownerOf` bawaan. Gunakan mapping terpisah atau cek `balanceOf(msg.sender, tokenId) > 0`.

**Revisi** — karena ERC1155 tidak punya `ownerOf`, ganti require dengan:

```solidity
require(balanceOf(msg.sender, tokenId) > 0, "Not token owner");
```

- [ ] **Step 4: Run test `requestPrint` — pastikan lulus**

```bash
cd contracts
forge test --match-test test_requestPrint -vvv
```

Expected: PASS semua test requestPrint

- [ ] **Step 5: Tulis test untuk `redeemCard()`**

```solidity
// === redeemCard tests ===

function test_redeemCard_transfers_to_recipient() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    card.requestPrint(tokenId, hash);
    card.redeemCard(tokenId, hash, user2);

    assertEq(card.balanceOf(user2, tokenId), 1);
    assertEq(card.balanceOf(vault, tokenId), 0);
}

function test_redeemCard_changes_status_to_digital() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    card.requestPrint(tokenId, hash);
    card.redeemCard(tokenId, hash, user2);

    assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));
}

function test_redeemCard_updates_last_owner() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    card.requestPrint(tokenId, hash);
    card.redeemCard(tokenId, hash, user2);

    assertEq(card.lastOwner(tokenId), user2);
}

function test_redeemCard_emits_status_changed_event() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    card.requestPrint(tokenId, hash);

    vm.expectEmit(true, false, false, true);
    emit GachardCard.CardStatusChanged(tokenId, GachardCard.CardStatus.Vaulted, GachardCard.CardStatus.Digital);
    card.redeemCard(tokenId, hash, user2);
}

function test_redeemCard_reverts_when_not_vaulted() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    vm.expectRevert("Card is not vaulted");
    card.redeemCard(tokenId, hash, user2);
}

function test_redeemCard_reverts_on_wrong_code() public {
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("correctcode");
    bytes32 wrongHash = keccak256("wrongcode");

    card.requestPrint(tokenId, hash);

    vm.expectRevert("Invalid redeem code");
    card.redeemCard(tokenId, wrongHash, user2);
}

function test_old_code_invalid_after_new_print() public {
    // SIKLUS KRITIS: mint → print(code1) → redeem(code1) → print(code2)
    // → redeem(code1) HARUS GAGAL karena hash sudah ditimpa
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash1 = keccak256("code_siklus_1");
    bytes32 hash2 = keccak256("code_siklus_2");

    // Siklus 1
    card.requestPrint(tokenId, hash1);
    card.redeemCard(tokenId, hash1, user2);
    assertEq(card.balanceOf(user2, tokenId), 1);

    // Siklus 2
    card.requestPrint(tokenId, hash2);

    // Coba redeem dengan kode lama — HARUS GAGAL
    vm.expectRevert("Invalid redeem code");
    card.redeemCard(tokenId, hash1, user1);

    // Redeem dengan kode baru — HARUS BERHASIL
    card.redeemCard(tokenId, hash2, user1);
    assertEq(card.balanceOf(user1, tokenId), 1);
}

function test_full_loop_three_cycles() public {
    // 3 siklus penuh: mint → print → redeem, ulangi 3x
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32[3] memory hashes = [
        keccak256("cycle_1_code"),
        keccak256("cycle_2_code"),
        keccak256("cycle_3_code")
    ];
    address[3] memory recipients = [user2, user1, user2];

    for (uint256 i = 0; i < 3; i++) {
        // Print
        card.requestPrint(tokenId, hashes[i]);
        assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Vaulted));
        assertEq(card.storedHash(tokenId), hashes[i]);

        // Redeem
        card.redeemCard(tokenId, hashes[i], recipients[i]);
        assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));
        assertEq(card.balanceOf(recipients[i], tokenId), 1);
    }
}

function test_redeemCard_works_when_called_by_anyone() public {
    // redeemCard bisa dipanggil siapa saja (backend atas nama user)
    // yang penting hash-nya benar
    uint256 tokenId = card.mintCard(user1, 0);
    bytes32 hash = keccak256("code123");

    card.requestPrint(tokenId, hash);

    // user2 yang memanggil, tapi recipientAddress = user1
    card.redeemCard(tokenId, hash, user1);
    assertEq(card.balanceOf(user1, tokenId), 1);
}
```

- [ ] **Step 6: Implementasi `redeemCard()` di kontrak**

Tambahkan ke `contracts/src/GachardCard.sol`:

```solidity
/**
 * @notice Redeem kartu dari vault kembali ke digital
 * @param tokenId ID kartu yang akan di-redeem
 * @param redeemHash Hash dari code yang dimasukkan user
 * @param recipientAddress Alamat yang akan menerima kartu (ADR-007)
 */
function redeemCard(uint256 tokenId, bytes32 redeemHash, address recipientAddress) external {
    require(cardStatus[tokenId] == CardStatus.Vaulted, "Card is not vaulted");
    require(storedHash[tokenId] == redeemHash, "Invalid redeem code");

    // Transfer dari vault ke recipient
    _transfer(VAULT, recipientAddress, tokenId, 1, "");

    // Ubah status
    cardStatus[tokenId] = CardStatus.Digital;

    // Update last owner
    lastOwner[tokenId] = recipientAddress;

    emit CardStatusChanged(tokenId, CardStatus.Vaulted, CardStatus.Digital);
}
```

- [ ] **Step 7: Run full test suite**

```bash
cd contracts
forge test -vvv
```

Expected: PASS semua test (lama + baru)

- [ ] **Step 8: Commit**

```bash
git add contracts/src/GachardCard.sol contracts/test/GachardCard.t.sol
git commit -m "feat: add requestPrint and redeemCard to smart contract"
```

---

## Task 2: Deploy Kontrak yang Di-update ke BNB Testnet

**Covers:** Deploy kontrak baru dengan requestPrint + redeemCard

**Files:**
- Modify: `frontend/.env.local` (update CONTRACT_ADDRESS)

**Interfaces:**
- Produces: `CONTRACT_ADDRESS` baru

- [ ] **Step 1: Deploy ulang kontrak**

```bash
cd contracts
export ADMIN_PRIVATE_KEY='<new_key>'
forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
```

- [ ] **Step 2: Catat contract address baru**

- [ ] **Step 3: Update `.env.local` dengan `CONTRACT_ADDRESS` baru**

- [ ] **Step 4: Verify di block explorer**

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: redeploy contract with requestPrint and redeemCard"
```

---

## Task 3: Update `blockchain.ts` — Tambah ABI dan Fungsi baru

**Covers:** Integrasi frontend ↔ kontrak baru

**Files:**
- Modify: `frontend/lib/blockchain.ts`

**Interfaces yang ditambahkan:**
- `requestPrint(tokenId, redeemHash)` → `txHash`
- `redeemCard(tokenId, redeemHash, recipientAddress)` → `txHash`

- [ ] **Step 1: Update ABI di `blockchain.ts`**

Tambahkan ke `GACHARD_ABI`:

```typescript
"function requestPrint(uint256 tokenId, bytes32 redeemHash) external",
"function redeemCard(uint256 tokenId, bytes32 redeemHash, address recipientAddress) external",
"function storedHash(uint256 tokenId) external view returns (bytes32)",
"function balanceOf(address account, uint256 id) external view returns (uint256)",
"event CardStatusChanged(uint256 indexed tokenId, uint8 oldStatus, uint8 newStatus)",
```

- [ ] **Step 2: Tambah fungsi `requestPrint()` dan `redeemCard()`**

```typescript
export async function requestPrint(tokenId: number, redeemHash: string): Promise<string> {
  const contract = getContract();
  const tx = await contract.requestPrint(tokenId, redeemHash);
  return tx.hash;
}

export async function redeemCard(
  tokenId: number,
  redeemHash: string,
  recipientAddress: string
): Promise<string> {
  const contract = getContract();
  const tx = await contract.redeemCard(tokenId, redeemHash, recipientAddress);
  return tx.hash;
}

export async function getStoredHash(tokenId: number): Promise<string> {
  const contract = getContract();
  return contract.storedHash(tokenId);
}
```

- [ ] **Step 3: Verifikasi TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/blockchain.ts
git commit -m "feat: add requestPrint and redeemCard to blockchain service"
```

---

## Task 4: Buat `lib/redeem-code.ts` — Generate dan Hash Redeem Code

**Covers:** ADR-005 (hash overwrite, kode tidak pernah disimpan plaintext)

**Files:**
- Create: `frontend/lib/redeem-code.ts`

**Interfaces:**
- `generateRedeemCode()` → string (12+ karakter alfanumerik)
- `hashRedeemCode(code)` → bytes32 (hex string untuk dikirim ke kontrak)

- [ ] **Step 1: Buat `redeem-code.ts`**

```typescript
import { createHash, randomBytes } from "crypto";

/**
 * Generate random redeem code (12+ karakter alfanumerik).
 * Kode plaintext TIDAK pernah disimpan di DB atau on-chain.
 */
export function generateRedeemCode(): string {
  return randomBytes(12).toString("base64url"); // ~16 karakter
}

/**
 * Hash redeem code untuk dikirim ke kontrak.
 * Menggunakan keccak256 agar kompatibel dengan Solidity.
 */
export function hashRedeemCode(code: string): string {
  const hash = createHash("sha3-256").update(code).digest("hex");
  return "0x" + hash;
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/redeem-code.ts
git commit -m "feat: add redeem code generation and hashing"
```

---

## Task 5: Buat `POST /api/print` — API Route untuk Request Print

**Covers:** ADR-018 (async pattern), integrasi backend ↔ smart contract

**Files:**
- Create: `frontend/app/api/print/route.ts`

**Alur:**
1. Terima `{userId, tokenId}` dari frontend
2. Verifikasi user memiliki kartu tersebut (opsional, bisa skip untuk demo)
3. Generate redeem code + hash
4. Panggil `requestPrint(tokenId, hash)` on-chain
5. Simpan transaksi sebagai pending
6. Simpan redeem code di MongoDB (ENKRIPSI, bukan plaintext) — untuk cetak fisik nanti
7. Return `{status: "pending", txId, txHash}` (jangan return code ke frontend!)

- [ ] **Step 1: Buat `POST /api/print`**

```typescript
// frontend/app/api/print/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { requestPrint } from "@/lib/blockchain";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-code";
import { encrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate redeem code (plaintext TIDAK pernah ke frontend atau on-chain)
    const code = generateRedeemCode();
    const hash = hashRedeemCode(code);

    // Submit requestPrint transaction (async — ADR-018)
    const txHash = await requestPrint(tokenId, hash);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "print",
      tokenId,
      txHash,
      status: "pending",
      fromAddress: user.walletAddress,
      toAddress: "vault",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan redeem code TERENKRIPSI untuk cetak fisik nanti
    // (akan diakses oleh proses cetak, bukan oleh user)
    const codesCollection = await getCollection("redeem_codes");
    await codesCollection.insertOne({
      tokenId,
      txId: result.insertedId.toString(),
      codeEncrypted: encrypt(code),
      status: "active", // active → used → expired
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      // JANGAN return code ke frontend!
    });
  } catch (error) {
    console.error("Print error:", error);
    return NextResponse.json({ error: "Print failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build dan verifikasi**

```bash
cd frontend
npm run build
```

Expected: `/api/print` muncul di route list

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/print/route.ts
git commit -m "feat: add POST /api/print endpoint with redeem code generation"
```

---

## Task 6: Buat `POST /api/redeem` — API Route untuk Redeem dengan Rate-Limiting

**Covers:** ADR-006 (rate-limited), ADR-007 (recipientAddress eksplisit), ADR-018 (async)

**Files:**
- Create: `frontend/app/api/redeem/route.ts`

**Alur:**
1. Terima `{userId, tokenId, code}` dari frontend
2. **CEK RATE-LIMIT DULU** — `checkRateLimit(userId, "redeem")`. Kalau limit terlampaui, return 429 TANPA mengirim transaksi on-chain
3. Hash code yang dimasukkan user
4. Panggil `redeemCard(tokenId, hash, user.walletAddress)` on-chain
5. Simpan transaksi sebagai pending
6. Update status redeem code di MongoDB menjadi "used"
7. Return `{status: "pending", txId, txHash}`

- [ ] **Step 1: Buat `POST /api/redeem`**

```typescript
// frontend/app/api/redeem/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { redeemCard } from "@/lib/blockchain";
import { hashRedeemCode } from "@/lib/redeem-code";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { userId, tokenId, code } = await request.json();

    // Get user
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // CEK RATE-LIMIT (ADR-006) — TOLAK sebelum transaksi on-chain
    const rateLimit = await checkRateLimit(user._id.toString(), "redeem");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", remaining: 0 },
        { status: 429 }
      );
    }

    // Hash code yang dimasukkan user
    const redeemHash = hashRedeemCode(code);

    // Submit redeemCard transaction (async — ADR-018)
    // recipientAddress = wallet user yang login (ADR-007)
    const txHash = await redeemCard(tokenId, redeemHash, user.walletAddress);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "redeem",
      tokenId,
      txHash,
      status: "pending",
      fromAddress: "vault",
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build dan verifikasi**

```bash
cd frontend
npm run build
```

Expected: `/api/redeem` muncul di route list

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/redeem/route.ts
git commit -m "feat: add POST /api/redeem endpoint with rate-limiting"
```

---

## Task 7: Test End-to-End di Testnet

**Covers:** Sprint 3 Definition of Done — full loop mint→print→redeem

- [ ] **Step 1: Mint kartu baru**

```bash
forge script script/MintTest.s.sol --rpc-url bsc_testnet --broadcast
```

Catat tokenId baru.

- [ ] **Step 2: Test requestPrint via cast**

```bash
# Generate hash (gunakan node)
HASH=$(node -e "const { createHash } = require('crypto'); console.log('0x' + createHash('sha3-256').update('testcode123').digest('hex'))")

# Panggil requestPrint
cast send <CONTRACT> "requestPrint(uint256,bytes32)" <TOKEN_ID> $HASH \
  --rpc-url bsc_testnet --private-key <ADMIN_KEY>
```

Verifikasi: `cardStatus(tokenId)` = 1 (Vaulted), `storedHash(tokenId)` = hash

- [ ] **Step 3: Test redeemCard via cast**

```bash
cast send <CONTRACT> "redeemCard(uint256,bytes32,address)" <TOKEN_ID> $HASH <USER_ADDRESS> \
  --rpc-url bsc_testnet --private-key <ADMIN_KEY>
```

Verifikasi: `cardStatus(tokenId)` = 0 (Digital), `balanceOf(user, tokenId)` = 1

- [ ] **Step 4: Test siklus ke-2 (hash overwrite)**

```bash
# Print lagi dengan kode baru
HASH2=$(node -e "const { createHash } = require('crypto'); console.log('0x' + createHash('sha3-256').update('newcode456').digest('hex'))")

cast send <CONTRACT> "requestPrint(uint256,bytes32)" <TOKEN_ID> $HASH2 \
  --rpc-url bsc_testnet --private-key <ADMIN_KEY>

# Coba redeem dengan kode lama — HARUS GAGAL
cast send <CONTRACT> "redeemCard(uint256,bytes32,address)" <TOKEN_ID> $HASH <USER_ADDRESS> \
  --rpc-url bsc_testnet --private-key <ADMIN_KEY>
# Expected: revert "Invalid redeem code"

# Redeem dengan kode baru — HARUS BERHASIL
cast send <CONTRACT> "redeemCard(uint256,bytes32,address)" <TOKEN_ID> $HASH2 <USER_ADDRESS> \
  --rpc-url bsc_testnet --private-key <ADMIN_KEY>
```

- [ ] **Step 5: Verifikasi block explorer**

Cek semua transaksi di https://testnet.bscscan.com/address/<CONTRACT>

- [ ] **Step 6: Commit**

```bash
git commit -m "test: verify full mint-print-redeem loop on BNB testnet"
```

---

## Task 8: Final Verification & Cleanup

**Covers:** Sprint 3 Definition of Done

- [ ] **Step 1: Run full Foundry test suite**

```bash
cd contracts
forge test -vvv
```

Expected: PASS semua test (mint + requestPrint + redeemCard + siklus)

- [ ] **Step 2: Frontend build**

```bash
cd frontend
npm run build
```

Expected: Build sukses, 6 API routes (auth, health, mint, print, redeem, transactions)

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: Tidak ada error

- [ ] **Step 4: Update MEMORY.md**

```markdown
- Sprint 3 progress:
  - [x] requestPrint() — status Digital → Vaulted, hash overwrite, transfer ke vault
  - [x] redeemCard() — cek hash, transfer ke recipientAddress, status → Digital
  - [x] Full loop mint→print→redeem 3 siklus terverifikasi di testnet
  - [x] POST /api/print dengan redeem code generation
  - [x] POST /api/redeem dengan rate-limiting (5/menit)
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "sprint-3: vault/print/redeem state machine complete"
```

---

## Checklist Sprint 3 Definition of Done

| Kriteria | Verifikasi |
|---|---|
| Full loop mint→print→redeem berhasil di testnet | cast send + block explorer |
| Hash lama terverifikasi tidak valid setelah siklus print baru | cast send (revert expected) |
| requestPrint revert saat status sudah Vaulted | forge test |
| Rate-limiting aktif di /api/redeem | Manual test (6 request → 429) |
| Kode ter-push ke GitHub | git log |
| Frontend build sukses | npm run build |

---

*Plan ini disusun untuk review sebelum eksekusi Sprint 3.*
