# Sprint 2 — Core Mint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smart contract BEP-1155 untuk mint kartu berfungsi di BNB Testnet, terverifikasi di block explorer, dan terintegrasi dengan frontend.

**Architecture:** Smart contract ditulis dalam Solidity, dikompilasi dan di-deploy via Foundry. Kontrak mengikuti standar BEP-1155 (ERC-1155) dengan state machine `Digital → Vaulted → Digital`. Backend (Next.js API routes) memanggil kontrak via ethers.js menggunakan wallet admin yang menyponsori gas fee.

**Tech Stack:** Solidity 0.8.x, Foundry (forge/cast), ethers.js v6, BNB Testnet, Next.js API Routes

## Global Constraints

- Token standard: BEP-1155 (ADR-001)
- Wallet custodial, tersembunyi dari user (ADR-002)
- Gas fee disponsori platform (ADR-003)
- Status default saat mint: `Digital` (ADR-004)
- Semua transaksi via backend, bukan langsung dari wallet user (ADR-007)
- Pola async untuk blockchain tx (ADR-018)
- Chain: BNB Testnet (chain ID 97)

---

## Task 1: Setup Wallet Testnet + Faucet

**Covers:** Prasyarat untuk semua task on-chain

**Files:**
- Create: `frontend/.env.local` (update — tambah env vars baru)

**Interfaces:**
- Produces: `ADMIN_WALLET_ADDRESS`, `ADMIN_PRIVATE_KEY` tersimpan di env

- [ ] **Step 1: Generate wallet admin untuk BNB Testnet**

Gunakan ethers.js untuk generate wallet baru:
```bash
node -e "const { ethers } = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

Catat output — ini wallet admin yang akan menyponsori gas fee.

- [ ] **Step 2: Claim BNB Testnet faucet**

1. Buka https://www.bnbchain.org/en/testnet-faucet
2. Paste address dari Step 1
3. Request BNB testnet (biasanya 0.5 BNB per request)
4. Verifikasi di block explorer: https://testnet.bscscan.com/address/<ADDRESS>

- [ ] **Step 3: Update environment variables**

Tambahkan ke `frontend/.env.local`:
```
ADMIN_WALLET_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
```

- [ ] **Step 4: Verifikasi wallet terisi**

```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
const address = process.env.ADMIN_WALLET_ADDRESS;
provider.getBalance(address).then(b => console.log('Balance:', ethers.formatEther(b), 'BNB'));
"
```

Expected: Balance > 0 BNB

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.local.example
git commit -m "chore: add BNB testnet env vars template"
```

---

## Task 2: Setup Foundry Project

**Covers:** Scaffolding untuk smart contract development

**Files:**
- Create: `contracts/` (directory)
- Create: `contracts/foundry.toml`
- Create: `contracts/src/` (directory)
- Create: `contracts/test/` (directory)

**Interfaces:**
- Produces: Foundry project structure siap untuk menulis smart contract

- [ ] **Step 1: Install Foundry**

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verifikasi:
```bash
forge --version
```

Expected: versi forge tercetak

- [ ] **Step 2: Inisialisasi Foundry project**

```bash
mkdir -p contracts
cd contracts
forge init --no-git --no-commit
```

- [ ] **Step 3: Konfigurasi foundry.toml**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"

[rpc_endpoints]
bsc_testnet = "${BSC_TESTNET_RPC}"

[etherscan]
bsc_testnet = { key = "${BSCSCAN_API_KEY}", url = "https://api-testnet.bscscan.com/api" }
```

- [ ] **Step 4: Verifikasi project structure**

```bash
ls -la contracts/
```

Expected: `src/`, `test/`, `lib/`, `foundry.toml`

- [ ] **Step 5: Commit**

```bash
git add contracts/
git commit -m "chore: initialize Foundry project for smart contracts"
```

---

## Task 3: Tulis Smart Contract BEP-1155 (mintCard)

**Covers:** ADR-001, ADR-004, PRD §5.5 (mintCard)

**Files:**
- Create: `contracts/src/GachardCard.sol`
- Create: `contracts/test/GachardCard.t.sol`

**Interfaces:**
- Consumes: (none — ini task pertama yang menulis kode kontrak)
- Produces: `GachardCard.sol` dengan fungsi `mintCard(address,uint8)`, `cardStatus()`, `cardRarity()`, `nextTokenId()`

- [ ] **Step 1: Tulis test untuk mintCard dengan rarity**

```solidity
// contracts/test/GachardCard.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GachardCard.sol";

contract GachardCardTest is Test {
    GachardCard public card;
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        card = new GachardCard();
    }

    function test_mint_creates_token_with_digital_status() public {
        uint256 tokenId = card.mintCard(user1, 0); // 0 = Common

        assertEq(card.balanceOf(user1, tokenId), 1);
        assertEq(uint8(card.cardStatus(tokenId)), uint8(GachardCard.CardStatus.Digital));
    }

    function test_mint_stores_rarity() public {
        uint256 id1 = card.mintCard(user1, 0); // Common
        uint256 id2 = card.mintCard(user1, 2); // Epic
        uint256 id3 = card.mintCard(user1, 3); // Legendary

        assertEq(uint8(card.cardRarity(id1)), 0);
        assertEq(uint8(card.cardRarity(id2)), 2);
        assertEq(uint8(card.cardRarity(id3)), 3);
    }

    function test_mint_increments_token_id() public {
        uint256 id1 = card.mintCard(user1, 0);
        uint256 id2 = card.mintCard(user2, 0);

        assertEq(id2, id1 + 1);
    }

    function test_mint_multiple_to_same_user() public {
        uint256 id1 = card.mintCard(user1, 0);
        uint256 id2 = card.mintCard(user1, 1);

        assertEq(card.balanceOf(user1, id1), 1);
        assertEq(card.balanceOf(user1, id2), 1);
        assertTrue(id1 != id2);
    }

    function test_mint_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit GachardCard.CardMinted(1, user1, GachardCard.CardStatus.Digital, GachardCard.Rarity.Common);
        card.mintCard(user1, 0);
    }

    function test_only_owner_can_mint() public {
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        card.mintCard(user1, 0);
    }

    function test_mint_reverts_on_invalid_rarity() public {
        vm.expectRevert("Invalid rarity");
        card.mintCard(user1, 4); // 4 tidak valid
    }
}
```

- [ ] **Step 2: Run test — pastikan gagal**

```bash
cd contracts
forge test --match-test test_mint -vvv
```

Expected: FAIL — `GachardCard` belum ada

- [ ] **Step 3: Tulis smart contract dengan rarity**

```solidity
// contracts/src/GachardCard.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GachardCard
 * @notice BEP-1155 token untuk kartu Gachard dengan state machine Digital/Vaulted
 * @dev ADR-001: BEP-1155 (one-token-per-instance, bukan fungible balance)
 * @dev ADR-004: Lock & Transfer ke Vault bukan Burn
 */
contract GachardCard is ERC1155, Ownable {
    enum CardStatus { Digital, Vaulted }
    enum Rarity { Common, Rare, Epic, Legendary }

    uint256 public nextTokenId = 1;

    mapping(uint256 => CardStatus) public cardStatus;
    mapping(uint256 => Rarity) public cardRarity;
    mapping(uint256 => bytes32) public storedHash;
    mapping(uint256 => address) public lastOwner;

    event CardMinted(uint256 indexed tokenId, address indexed to, CardStatus status, Rarity rarity);
    event CardStatusChanged(uint256 indexed tokenId, CardStatus oldStatus, CardStatus newStatus);

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @notice Mint kartu baru dengan status default Digital dan rarity tertentu
     * @param to Alamat penerima kartu
     * @param rarity Rarity kartu (0=Common, 1=Rare, 2=Epic, 3=Legendary)
     * @return tokenId ID kartu yang baru di-mint
     */
    function mintCard(address to, uint8 rarity) external onlyOwner returns (uint256 tokenId) {
        require(rarity <= 3, "Invalid rarity");
        tokenId = nextTokenId++;
        _mint(to, tokenId, 1, "");
        cardStatus[tokenId] = CardStatus.Digital;
        cardRarity[tokenId] = Rarity(rarity);
        lastOwner[tokenId] = to;
        emit CardMinted(tokenId, to, CardStatus.Digital, Rarity(rarity));
    }

    /**
     * @notice Override transfer untuk menolak transfer saat status Vaulted
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (cardStatus[ids[i]] == CardStatus.Vaulted && from != address(0)) {
                revert("Card is vaulted, transfer blocked");
            }
        }
        super._update(from, to, ids, values);
    }
}
```

- [ ] **Step 4: Install OpenZeppelin contracts**

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit
```

- [ ] **Step 5: Run test — pastikan lulus**

```bash
cd contracts
forge test --match-test test_mint -vvv
```

Expected: PASS semua test mint

- [ ] **Step 6: Run full test suite**

```bash
cd contracts
forge test -vvv
```

Expected: PASS semua test

- [ ] **Step 7: Commit**

```bash
git add contracts/src/GachardCard.sol contracts/test/GachardCard.t.sol
git commit -m "feat: add BEP-1155 smart contract with mintCard and Digital/Vaulted state machine"
```

---

## Task 4: Deploy ke BNB Testnet

**Covers:** PRD §5.5, Sprint 2 Definition of Done

**Files:**
- Create: `contracts/script/Deploy.s.sol`
- Modify: `frontend/.env.local` (tambah `CONTRACT_ADDRESS`)

**Interfaces:**
- Consumes: `ADMIN_PRIVATE_KEY`, `BSC_TESTNET_RPC` dari env
- Produces: `CONTRACT_ADDRESS` — alamat kontrak yang ter-deploy

- [ ] **Step 1: Tulis deploy script**

```solidity
// contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GachardCard.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        GachardCard card = new GachardCard();
        
        vm.stopBroadcast();
    }
}
```

- [ ] **Step 2: Deploy ke BNB Testnet**

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast --verify
```

Expected: Contract address tercetak di output

- [ ] **Step 3: Verifikasi di block explorer**

1. Buka https://testnet.bscscan.com/address/<CONTRACT_ADDRESS>
2. Pastikan kontrak ter-deploy
3. Cek tab "Contract" — kode harus ter-verify

- [ ] **Step 4: Update env vars**

Tambahkan ke `frontend/.env.local`:
```
CONTRACT_ADDRESS=0x...
```

- [ ] **Step 5: Commit**

```bash
git add contracts/script/Deploy.s.sol
git commit -m "feat: add deploy script for BNB testnet"
```

---

## Task 5: Test Mint di Testnet

**Covers:** Sprint 2 Definition of Done — "Mint berhasil, token terlihat di block explorer"

**Files:**
- Create: `contracts/script/MintTest.s.sol`

**Interfaces:**
- Consumes: `CONTRACT_ADDRESS`, `ADMIN_PRIVATE_KEY`
- Produces: Token ter-mint di BNB Testnet, terverifikasi di block explorer

- [ ] **Step 1: Tulis mint test script**

```solidity
// contracts/script/MintTest.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GachardCard.sol";

contract MintTestScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        address testUser = vm.envAddress("ADMIN_WALLET_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        GachardCard card = GachardCard(contractAddress);

        // Mint 3 test cards with different rarities
        uint256 id1 = card.mintCard(testUser, 0); // Common
        uint256 id2 = card.mintCard(testUser, 1); // Rare
        uint256 id3 = card.mintCard(testUser, 2); // Epic

        vm.stopBroadcast();
    }
}
```

- [ ] **Step 2: Jalankan mint test**

```bash
cd contracts
forge script script/MintTest.s.sol --rpc-url bsc_testnet --broadcast
```

Expected: 3 transaksi mint berhasil

- [ ] **Step 3: Verifikasi di block explorer**

1. Buka https://testnet.bscscan.com/address/<CONTRACT_ADDRESS>
2. Tab "Transactions" — harus ada 3 tx mint
3. Tab "Token" — harus ada token ERC-1155

- [ ] **Step 4: Verifikasi balance**

```bash
cast call <CONTRACT_ADDRESS> "balanceOf(address,uint256)(uint256)" <ADMIN_ADDRESS> 1 --rpc-url bsc_testnet
```

Expected: `1`

- [ ] **Step 5: Commit**

```bash
git add contracts/script/MintTest.s.sol
git commit -m "test: verify mint on BNB testnet"
```

---

## Task 6: Integrasi Frontend — API Route untuk Mint

**Covers:** ADR-018 (async pattern), integrasi backend ↔ smart contract

**Files:**
- Create: `frontend/lib/blockchain.ts`
- Create: `frontend/lib/odds.ts`
- Create: `frontend/lib/card-templates.ts`
- Create: `frontend/app/api/mint/route.ts`

**Interfaces:**
- Consumes: `CONTRACT_ADDRESS`, `ADMIN_PRIVATE_KEY`, `BSC_TESTNET_RPC` dari env
- Produces: `POST /api/mint` endpoint yang return `{status, txId}` (async pattern)

- [ ] **Step 1: Buat blockchain service dengan rarity support**

```typescript
// frontend/lib/blockchain.ts
import { ethers } from "ethers";
import { decrypt } from "./crypto";

const RPC_URL = process.env.BSC_TESTNET_RPC!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;

// ABI minimal untuk fungsi yang dibutuhkan
const GACHARD_ABI = [
  "function mintCard(address to, uint8 rarity) external returns (uint256 tokenId)",
  "function cardStatus(uint256 tokenId) external view returns (uint8)",
  "function cardRarity(uint256 tokenId) external view returns (uint8)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "event CardMinted(uint256 indexed tokenId, address indexed to, uint8 status, uint8 rarity)",
];

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getAdminWallet() {
  const provider = getProvider();
  const encryptedKey = process.env.ADMIN_PRIVATE_KEY!;
  const privateKey = decrypt(encryptedKey);
  return new ethers.Wallet(privateKey, provider);
}

export function getContract(signer?: ethers.Signer) {
  const s = signer || getAdminWallet();
  return new ethers.Contract(CONTRACT_ADDRESS, GACHARD_ABI, s);
}

export async function mintCard(toAddress: string, rarity: number): Promise<string> {
  const contract = getContract();
  const tx = await contract.mintCard(toAddress, rarity);
  return tx.hash;
}

export async function getCardStatus(tokenId: number): Promise<number> {
  const contract = getContract();
  return contract.cardStatus(tokenId);
}

export async function getCardRarity(tokenId: number): Promise<number> {
  const contract = getContract();
  return contract.cardRarity(tokenId);
}

export async function getBalance(address: string, tokenId: number): Promise<bigint> {
  const contract = getContract();
  return contract.balanceOf(address, tokenId);
}
```

- [ ] **Step 2: Buat card templates collection + lib/card-templates.ts**

```typescript
// frontend/lib/card-templates.ts
import { getCollection } from "./mongodb";

export interface CardTemplate {
  templateId: string;
  rarity: number;   // 0=Common, 1=Rare, 2=Epic, 3=Legendary
  name: string;
  artworkUrl: string;
}

// Default placeholder templates (2 per rarity)
const DEFAULT_TEMPLATES: CardTemplate[] = [
  { templateId: "common-1", rarity: 0, name: "Common Card A", artworkUrl: "" },
  { templateId: "common-2", rarity: 0, name: "Common Card B", artworkUrl: "" },
  { templateId: "rare-1", rarity: 1, name: "Rare Card A", artworkUrl: "" },
  { templateId: "rare-2", rarity: 1, name: "Rare Card B", artworkUrl: "" },
  { templateId: "epic-1", rarity: 2, name: "Epic Card A", artworkUrl: "" },
  { templateId: "epic-2", rarity: 2, name: "Epic Card B", artworkUrl: "" },
  { templateId: "legendary-1", rarity: 3, name: "Legendary Card A", artworkUrl: "" },
  { templateId: "legendary-2", rarity: 3, name: "Legendary Card B", artworkUrl: "" },
];

/**
 * Seed card_templates collection with defaults if empty.
 * Call once at startup or lazily on first access.
 */
export async function seedCardTemplates(): Promise<void> {
  const collection = await getCollection("card_templates");
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(DEFAULT_TEMPLATES);
  }
}

/**
 * Pick a random card template for the given rarity.
 * Returns templateId and metadata.
 */
export async function pickCardTemplate(rarity: number): Promise<CardTemplate> {
  const collection = await getCollection("card_templates");
  const templates = await collection.find({ rarity }).toArray();

  if (templates.length === 0) {
    // Fallback to defaults if DB is empty
    const fallback = DEFAULT_TEMPLATES.filter((t) => t.rarity === rarity);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return templates[Math.floor(Math.random() * templates.length)];
}
```

Seed data di `/api/health` atau saat pertama kali dipanggil. Simpan `templateId` di collection `cards` (linked ke tokenId on-chain):

```typescript
// Di dalam /api/mint, setelah mintCard() berhasil:
const cardsCollection = await getCollection("cards");
await cardsCollection.insertOne({
  tokenId: null, // akan diisi setelah konfirmasi on-chain
  txId: result.insertedId.toString(),
  templateId: template.templateId,
  rarity,
  ownerAddress: user.walletAddress,
  status: "pending",
  createdAt: new Date().toISOString(),
});
```

- [ ] **Step 3: Buat odds table dan weighted random pick**

```typescript
// frontend/lib/odds.ts
import { getCollection } from "./mongodb";

export interface OddsEntry {
  rarity: number;   // 0=Common, 1=Rare, 2=Epic, 3=Legendary
  weight: number;   // bobot relatif
  label: string;
}

// Default odds table (bisa di-override dari MongoDB, lihat ADR-009)
const DEFAULT_ODDS: OddsEntry[] = [
  { rarity: 0, weight: 70, label: "Common" },
  { rarity: 1, weight: 20, label: "Rare" },
  { rarity: 2, weight: 8, label: "Epic" },
  { rarity: 3, weight: 2, label: "Legendary" },
];

/**
 * Get odds table from MongoDB or fall back to defaults.
 */
export async function getOddsTable(): Promise<OddsEntry[]> {
  try {
    const collection = await getCollection("odds");
    const stored = await collection.findOne({ _id: "default" });
    if (stored && stored.entries) {
      return stored.entries;
    }
  } catch {
    // Collection might not exist yet
  }
  return DEFAULT_ODDS;
}

/**
 * Weighted random pick based on odds table.
 * Returns rarity value (0-3).
 */
export async function pickRarity(): Promise<number> {
  const odds = await getOddsTable();
  const totalWeight = odds.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of odds) {
    random -= entry.weight;
    if (random <= 0) {
      return entry.rarity;
    }
  }

  return 0; // Fallback Common
}
```

- [ ] **Step 3: Buat API route untuk mint dengan rarity**

```typescript
// frontend/app/api/mint/route.ts
import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { mintCard } from "@/lib/blockchain";
import { pickRarity } from "@/lib/odds";
import { pickCardTemplate, seedCardTemplates } from "@/lib/card-templates";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    // Get user from DB
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Seed card templates if needed
    await seedCardTemplates();

    // Weighted random pick rarity SEBELUM mint (ADR-009: odds di backend)
    const rarity = await pickRarity();

    // Pick card template for this rarity
    const template = await pickCardTemplate(rarity);

    // Submit mint transaction (async — tidak tunggu konfirmasi, ADR-018)
    const txHash = await mintCard(user.walletAddress, rarity);

    // Simpan transaksi sebagai pending
    const txCollection = await getCollection("transactions");
    const result = await txCollection.insertOne({
      userId: user._id.toString(),
      type: "mint",
      rarity,
      templateId: template.templateId,
      txHash,
      status: "pending",
      fromAddress: process.env.ADMIN_WALLET_ADDRESS,
      toAddress: user.walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Simpan card record (linked ke tokenId on-chain setelah konfirmasi)
    const cardsCollection = await getCollection("cards");
    await cardsCollection.insertOne({
      tokenId: null,
      txId: result.insertedId.toString(),
      templateId: template.templateId,
      rarity,
      ownerAddress: user.walletAddress,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "pending",
      txId: result.insertedId.toString(),
      txHash,
      rarity,
      template: {
        templateId: template.templateId,
        name: template.name,
      },
    });
  } catch (error) {
    console.error("Mint error:", error);
    return NextResponse.json(
      { error: "Mint failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Build dan verifikasi tidak ada error**

```bash
cd frontend
npm run build
```

Expected: Build sukses, `/api/mint` muncul di route list

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/blockchain.ts frontend/lib/odds.ts frontend/lib/card-templates.ts frontend/app/api/mint/route.ts
git commit -m "feat: add mint API route with rarity, card templates, and async transaction pattern"
```

---

## Task 7: Final Verification & Cleanup

**Covers:** Sprint 2 Definition of Done

- [ ] **Step 1: Verifikasi smart contract di block explorer**

1. Buka https://testnet.bscscan.com/address/<CONTRACT_ADDRESS>
2. Cek "Contract" tab — kode ter-verify
3. Cek "Transactions" — ada mint transactions
4. Cek "Token" — ada ERC-1155 tokens

- [ ] **Step 2: Verifikasi frontend build**

```bash
cd frontend
npm run build
```

Expected: Build sukses

- [ ] **Step 3: Verifikasi tidak ada error TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: Tidak ada error

- [ ] **Step 4: Update MEMORY.md**

Update Sprint 2 progress:
```
- [x] Setup wallet testnet + claim faucet
- [x] Smart contract BEP-1155 untuk mint kartu
- [x] Deploy ke BNB Testnet
- [x] Test mint di testnet, verifikasi di block explorer
- [x] Integrasi frontend (API route /api/mint)
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "sprint-2: core mint complete — BEP-1155 deployed to BNB testnet"
```

---

## Checklist Sprint 2 Definition of Done

| Kriteria | Verifikasi |
|---|---|
| Mint berhasil, token terlihat di block explorer | `cast call` + bscscan.com |
| Status `Digital` tercatat benar per token | `cardStatus(tokenId)` returns 0 |
| Kode ter-push ke GitHub | `git log` |
| Frontend build sukses | `npm run build` |

---

*Plan ini disusun untuk eksekusi oleh agentic worker. Bisa dibaca oleh Claude Code, MiMoCode, atau tool AI lainnya.*
