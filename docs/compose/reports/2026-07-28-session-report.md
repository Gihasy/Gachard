# Laporan Sesi 28 Juli 2026 — Security, Clean-Slate, Pack Redesign

## Ringkasan Eksekutif

Sesi ini mencakup 4 area utama: (1) perbaikan keamanan dan reliabilitas, (2) investigasi root cause on-chain, (3) clean-slate database untuk Demo Day, dan (4) redesign pack system dengan opening animation. Total 4 commit, 19+ file berubah, 3x deploy ke production.

---

## 1. Perbaikan Keamanan & Reliabilitas

### 1.1 Auto-confirm Dihapus dari POST Handlers

**File:** `app/api/mint/route.ts`, `app/api/print/route.ts`, `app/api/redeem/route.ts`

**Masalah:** Endpoint mint/print/redeem memiliki polling loop internal (10x retry, 2s interval) yang menunggu konfirmasi on-chain di dalam request HTTP yang sama. Ini berbahaya karena:
- Vercel serverless function punya timeout 10 detik
- Jika function di-kill sebelum mencapai catch block, refund mechanism bisa ter-skip
- Melanggar ADR-018 (async pattern)

**Solusi:** Hapus polling loop dari ketiga route. Endpoint langsung return `{ status: "pending" }`. Frontend polling `GET /api/transactions` yang memanggil `confirmTransaction()`.

**Bukti:**
- `mint/route.ts`: 133 → 113 baris
- `print/route.ts`: 80 → 61 baris
- `redeem/route.ts`: 79 → 61 baris
- Import `confirmTransaction` dan `getProvider` dihapus dari ketiga file

### 1.2 Cache-Control Headers di Admin Routes

**File:** 6 file di `app/api/admin/`

**Masalah:** Route admin mengembalikan data sensitif (redeem code terdekripsi) tanpa header cache control.

**Solusi:** Tambah `Cache-Control: no-store, private` di SEMUA response (success dan error) untuk:
- `admin/print-requests/route.ts`
- `admin/users/route.ts`
- `admin/transactions/route.ts`
- `admin/cards/route.ts`
- `admin/accept-print/route.ts`
- `admin/confirm-all/route.ts`

**Audit:** Tidak ada `console.log` di seluruh codebase. Hanya `console.error`/`console.warn` untuk error logging.

### 1.3 contractAddress Field di Records

**File:** `app/api/mint/route.ts`, `app/api/print/route.ts`, `app/api/redeem/route.ts`

**Masalah:** Records di collection `cards` dan `transactions` tidak mencatat kontrak mana yang digunakan, menyulitkan tracking jika ada multiple contract deployments.

**Solusi:** Tambah `contractAddress: process.env.CONTRACT_ADDRESS!` ke semua record baru di ketiga route.

---

## 2. Investigasi Root Cause On-Chain

### 2.1 Temuan: 3 Kontrak Berbeda

| Sprint | Address | nextTokenId | Status |
|--------|---------|:-----------:|--------|
| Sprint 2 | `0xc7D37b43Fa706C646F89B19B78B9C2329925731C` | 4 | Tidak dipakai |
| Sprint 3 | `0x122ace919D9da1DdB736ce6c0Db6F00638ab0637` | 5 | Tidak dipakai |
| **Current** | `0xe62bC7c470EAEf3FCAd1816b9AC6d63D585B5EE8` | 41+ | **Aktif** |

### 2.2 Temuan: Deployed Contract = Source Code

Pengecekan on-chain membuktikan deployed contract SAMA dengan source code:
- `requestPrint()` melakukan `_update(ownerAddress, address(this))` → NFT PINDAH ke vault
- `_update()` override memblokir transfer saat `cardStatus == Vaulted`

**Test on-chain (tokenId 46):**
```
Mint → Digital, balance=1
requestPrint → Vaulted, balance=0, contractBalance=1
safeTransferFrom → REVERT: "Card is vaulted, transfer blocked"
```

**Test control (tokenId 45):**
```
Mint → Digital, balance=1
safeTransferFrom → SUCCESS
```

### 2.3 Koreksi Temuan Sebelumnya

Temuan awal ("39/40 token punya ownerBalance=1") **salah** karena:
1. Ethers v6 memerlukan checksummed addresses — error sebelumnya tersembunyi
2. Perbandingan BigInt (`status === 1`) vs number (`status === 1n`) — bug di script awal

Setelah diperbaiki: token 1-13, 15-40 adalah `cardStatus=0` (Digital), bukan Vaulted. Hanya tokenId 14 yang `cardStatus=1` (Vaulted) dengan `contractBalance=1`.

### 2.4 ADR-004 Diklarifikasi

**File:** `DECISIONS.md`

ADR-004 diupdate dari "Lock & Transfer ke Vault" menjadi deskripsi yang lebih akurat:
- Judul: "Lock In-Place via Status Flag"
- Ditambah: hasil verifikasi on-chain 28 Juli 2026
- Ditambah: test safeTransferFrom yang membuktikan transfer block

---

## 3. Clean-Slate Database untuk Demo Day

### 3.1 Database Cleanup

**Data yang dihapus:**
- 41 cards
- 12 transactions
- 4 redeem_codes
- 4 rate_limits

**Data yang dipertahankan:**
- 3 users
- 8 card_templates

**Demo user setup:**
- Username: `gigih.hartanto.s`
- Credit: 5000 (10 packs)

### 3.2 Kartu Baru

**2 pack dimint (16 kartu, tokenId 47-62):**

Pack 1: Rare, Common, Common, Legendary, Common, Common, Rare, Rare
Pack 2: Rare, Rare, Common, Rare, Common, Common, Common, Common

**Verifikasi on-chain:** Semua 16 kartu `status=Digital`, `balance=1`, `contractAddress` tercatat.

### 3.3 Print Flow Test

tokenId 47 berhasil di-vault:
- `requestPrint()` → tx success
- `cardStatus(47)` = 1 (Vaulted)
- `balanceOf(user, 47)` = 0
- `balanceOf(contract, 47)` = 1
- `safeTransferFrom` → REVERT

---

## 4. Redesign Pack System

### 4.1 Pack Types Baru

| Pack | Harga | Kartu | Guaranteed Rare+ |
|------|-------|-------|-----------------|
| Standard | 500 Credit ($5) | 5 | 1 |
| Booster | 800 Credit ($8) | 10 | 2 |

### 4.2 API Changes

**`/api/mint`** — menerima parameter `packType`:
```
POST { userId, packType: "standard" | "booster" }
```

Mapping di-hardcode di route:
```typescript
const PACK_TYPES = {
  standard: { price: 500, cards: 5, guaranteed: 1 },
  booster: { price: 800, cards: 10, guaranteed: 2 },
};
```

**`lib/odds.ts`** — `buildPackRarities()` diparameterisasi:
```typescript
buildPackRarities(packSize: number = 8, guaranteedCount: number = 1)
```

### 4.3 UI Changes

**`/packs` page** — full rewrite:
- 2 pack cards berdampingan (Standard biru, Booster gold)
- Balance display dengan Top Up button
- Opening flow: Buy → "Pack Ready!" → "Open Pack" → flip reveal animation

**`PackCard.tsx`** — 2 variants dengan gradient berbeda:
- Standard: blue gradient (`--electric-blue`)
- Booster: gold gradient (`--aurora-gold`)

**`PackReveal.tsx`** — flip animation:
- State machine: ready → revealing → done
- Kartu diurutkan dari rarity terendah ke tertinggi (build suspense)
- Flip animation: `rotateY(180deg)` → `rotateY(0deg)`, 0.5s interval
- Card back (? icon) → front (artwork + rarity glow)

**Homepage changes:**
- "Play Now" dihapus
- "Explore Cards" → "Collect Now", mengarah ke `/packs`
- CTA band: "Open First Pack" → "Collect Now" ke `/packs`
- Buy flow dipindah dari homepage ke `/packs`

### 4.4 File yang Berubah

| File | Perubahan |
|------|-----------|
| `lib/odds.ts` | `buildPackRarities(packSize, guaranteedCount)` — parameterized |
| `app/api/mint/route.ts` | Accept `packType`, dynamic price + card count |
| `components/PackCard.tsx` | Full rewrite: 2 variants (Standard/Booster) |
| `components/home/PackReveal.tsx` | Full rewrite: flip animation reveal |
| `app/packs/page.tsx` | Full rewrite: 2 pack cards + opening flow + Top Up |
| `app/page.tsx` | Simplified: remove buy flow, use Link for /packs |
| `components/home/HomeHero.tsx` | Remove Play Now, Explore Cards → Collect Now |
| `components/home/HomeCtaBand.tsx` | Remove Explore Market, add Collect Now |

---

## 5. Deploy History

| # | Commit | Message | Deploy |
|---|--------|---------|--------|
| 1 | `969d761` | Security fixes, clean-slate, pack system redesign | ✅ Production |
| 2 | `05fcd49` | Remove Play Now, Explore Cards → Collect Cards → /packs, Top Up | ✅ Production |
| 3 | `5a6a75e` | Collect Cards → Collect Now | ✅ Production |

---

## 6. Verifikasi

| Item | Status | Bukti |
|------|--------|-------|
| TypeScript | ✅ Pass | `npx tsc --noEmit` — no errors |
| Build | ✅ Pass | `npm run build` — 30 pages generated |
| Auto-confirm removed | ✅ Verified | Code review — no polling loops |
| Cache-Control headers | ✅ Verified | Code review — all 6 admin routes |
| contractAddress field | ✅ Verified | Code review — all 3 API routes |
| On-chain transfer block | ✅ Verified | `safeTransferFrom` → REVERT |
| Database clean | ✅ Verified | 0 cards, 0 txs before mint |
| New cards minted | ✅ Verified | 16 cards, all on-chain Digital |
| Pack system | ✅ Verified | Build pass, deploy success |
| Collect Now text | ✅ Verified | Deploy success |

---

## 7. Dokumen yang Dihasilkan

| File | Tipe | Keterangan |
|------|------|------------|
| `docs/compose/plans/2026-07-28-clean-slate-demo-day.md` | Plan | Rencana clean-slate |
| `docs/compose/plans/2026-07-28-pack-system-redesign.md` | Plan | Implementation plan pack system |
| `docs/compose/specs/2026-07-28-pack-system-redesign.md` | Spec | Design spec pack system |
| `docs/compose/reports/2026-07-28-session-report.md` | Report | Laporan ini |

---

## 8. Perubahan pada Dokumen Project

| File | Perubahan |
|------|-----------|
| `DECISIONS.md` | ADR-004 diklarifikasi dengan hasil verifikasi on-chain |
| `MEMORY.md` | Updated: clean-slate status, Print-to-Real Flow corrected, Blockchain Abstraction updated |

---

*Laporan ini disusun pada 28 Juli 2026, mencakup semua pembaharuan dari awal sesi hingga deploy terakhir.*
