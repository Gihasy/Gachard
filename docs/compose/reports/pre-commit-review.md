# Laporan Pre-Commit — Status Bersih
**Tanggal**: 22 Juli 2026
**Sprint**: 2 (selesai)
**Tujuan**: Review sebelum commit ke GitHub

---

## 1. Status Keamanan

| Item | Status | Detail |
|---|---|---|
| `.env.local` di `.gitignore` | Aman | Pattern `.env*` ada di `.gitignore`, tidak muncul di `git status` |
| Private key di docs | Bersih | Sudah di-scan, tidak ada private key mentah di file yang akan di-commit |
| Wallet lama | Tidak dipakai | Sudah diganti dengan wallet baru |
| Kontrak lama | Tidak dipakai | Sudah diganti dengan kontrak baru |
| `contracts/broadcast/` | Ter-gitignore | Pattern ada di `.gitignore` |

### Info Aktif (TIDAK akan masuk ke commit)

```
Wallet:     0xF7DEd49EB412F69520c38C3f7e36523d71428DEa
Kontrak:    0xc7d37b43fa706c646f89b19b78b9c2329925731c
Chain:      BNB Testnet (97)
RPC:        https://bsc-testnet-rpc.publicnode.com
```

---

## 2. File yang Akan Di-Commit

### Modified (sudah ada, diubah)

| File | Perubahan |
|---|---|
| `DECISIONS.md` | +ADR-017, 018, 019, 020; ADR-001 diperjelas |
| `MEMORY.md` | Updated Sprint 2 progress + arsitektur baru |
| `README.md` | Updated stack + deployment (single service) |
| `frontend/app/api/auth/google/route.ts` | Pakai `lib/auth.ts` + `lib/wallet.ts` |
| `frontend/app/api/health/route.ts` | Minor update |
| `frontend/package.json` | + `ethers` dependency |
| `frontend/package-lock.json` | Auto-generated |
| `sprints/SPRINT-1.md` | Updated tasks + architecture notes |
| `sprints/SPRINT-2.md` | Updated checklist + contract address |

### Deleted (backend FastAPI)

| File | Alasan |
|---|---|
| `backend/.env.example` | Migrasi ke Next.js API routes |
| `backend/database.py` | Migrasi |
| `backend/main.py` | Migrasi |
| `backend/models/user.py` | Migrasi |
| `backend/requirements.txt` | Migrasi |
| `backend/routes/auth.py` | Migrasi |
| `backend/services/auth_service.py` | Migrasi |
| `backend/services/wallet_service.py` | Migrasi |
| `backend/test_wallet.py` | Migrasi |
| `backend/models/__init__.py` | Migrasi |
| `backend/routes/__init__.py` | Migrasi |
| `backend/__pycache__/*` | Cleanup |
| `backend/routes/__pycache__/*` | Cleanup |
| `backend/services/__pycache__/*` | Cleanup |

### New (untracked)

| File | Fungsi |
|---|---|
| `.gitignore` | Git ignore rules |
| `contracts/src/GachardCard.sol` | Smart contract BEP-1155 |
| `contracts/test/GachardCard.t.sol` | 7 unit tests |
| `contracts/script/Deploy.s.sol` | Deploy script |
| `contracts/script/MintTest.s.sol` | Mint test script |
| `contracts/foundry.toml` | Foundry config |
| `contracts/remappings.txt` | Import remappings |
| `contracts/lib/forge-std/` | Foundry standard library |
| `contracts/lib/openzeppelin-contracts/` | OpenZeppelin v5 |
| `frontend/lib/auth.ts` | Google OAuth + encrypted wallet |
| `frontend/lib/blockchain.ts` | ethers.js provider + contract |
| `frontend/lib/card-templates.ts` | Card template CRUD |
| `frontend/lib/crypto.ts` | AES-256-GCM encrypt/decrypt |
| `frontend/lib/mongodb.ts` | MongoDB connection |
| `frontend/lib/odds.ts` | Odds table + pickRarity() |
| `frontend/lib/rate-limit.ts` | MongoDB rate-limiting |
| `frontend/lib/transactions.ts` | Async tx + confirmTransaction() |
| `frontend/lib/wallet.ts` | Custodial wallet (ethers.js) |
| `frontend/app/api/mint/route.ts` | POST /api/mint |
| `frontend/app/api/transactions/route.ts` | GET /api/transactions |
| `frontend/public/icons/icon-192.png` | PWA icon |
| `frontend/public/icons/icon-512.png` | PWA icon |
| `docs/STATUS-REPORT.md` | Status report |
| `docs/SETUP-KOYEB-MONGODB.md` | Setup guide (obsolete) |
| `docs/SETUP-MONGODB-ATLAS.md` | Setup guide |
| `docs/SETUP-RENDER-MONGODB.md` | Setup guide (obsolete) |
| `docs/compose/plans/2026-07-22-sprint-2-core-mint.md` | Sprint 2 plan |
| `docs/compose/reports/pre-sprint-2-review.md` | Pre-Sprint 2 report |
| `docs/compose/reports/sprint-1-final.md` | Sprint 1 report |
| `docs/compose/reports/sprint-2-final.md` | Sprint 2 report |

---

## 3. Build Verification

| Check | Status |
|---|---|
| TypeScript (`npx tsc --noEmit`) | OK |
| Next.js build (`npm run build`) | OK |
| Routes | `/`, `/login`, `/koleksi`, `/profil`, `/api/auth/google`, `/api/health`, `/api/mint`, `/api/transactions` |

---

## 4. On-Chain Verification

| Item | Value |
|---|---|
| Kontrak | `0xc7d37b43fa706c646f89b19b78b9c2329925731c` |
| `nextTokenId` | 4 (3 kartu ter-mint) |
| Token 1 | Status=Digital(0), Rarity=Common(0) |
| Token 2 | Status=Digital(0), Rarity=Rare(1) |
| Token 3 | Status=Digital(0), Rarity=Epic(2) |
| Block explorer | https://testnet.bscscan.com/address/0xc7d37b43fa706c646f89b19b78b9c2329925731c |

---

## 5. Yang TIDAK Di-Commit (dan Alasannya)

| File | Alasan |
|---|---|
| `frontend/.env.local` | Berisi secrets (MongoDB URL, private key, encryption key) |
| `contracts/out/` | Build artifacts (auto-generated) |
| `contracts/broadcast/` | Deploy artifacts (berisi address, auto-generated) |
| `contracts/cache/` | Foundry cache |

---

## 6. Catatan

1. **`docs/SETUP-KOYEB-MONGODB.md`** dan **`docs/SETUP-RENDER-MONGODB.md`** adalah setup guide lama untuk backend terpisah yang sudah tidak dipakai. Bisa dihapus kalau mau, atau disimpan sebagai referensi historis.

2. **`contracts/lib/`** berisi OpenZeppelin dan forge-std — ini dependencies yang di-install via `forge install`. Biasanya di-gitignore di project Foundry, tapi karena kita tidak punya `foundry.toml` di root, mereka masuk sebagai untracked files. Alternatif: tambahkan `contracts/lib/` ke `.gitignore` dan install ulang saat clone.

3. **Kontrak baru belum di-verify** di BscScan. Ini opsional untuk hackathon demo.

---

*Laporan ini disusun untuk review sebelum commit ke GitHub.*
