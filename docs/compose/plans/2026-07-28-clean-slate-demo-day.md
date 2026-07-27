# Clean-Slate Plan untuk Demo Day
**Tanggal**: 28 Juli 2026
**Status**: RENCANA — belum dieksekusi

---

## 1. Temuan Investigasi

### Root Cause: 3 Kontrak Berbeda

| # | Sprint | Contract Address | nextTokenId | Keterangan |
|---|--------|-----------------|:-----------:|------------|
| 1 | Sprint 2 | `0xc7D37b43Fa706C646F89B19B78B9C2329925731C` | 4 | `mintCard` only, tanpa `requestPrint`/`redeemCard` |
| 2 | Sprint 3 | `0x122ace919D9da1DdB736ce6c0Db6F00638ab0637` | 5 | Tambah `requestPrint` + `redeemCard` |
| 3 | Current | `0xe62bC7c470EAEf3FCAd1816b9AC6d63D585B5EE8` | 41 | Tambah `mintBatch()`, dipakai sekarang |

### Deployed Contract vs Source Code

Source code repo (`contracts/src/GachardCard.sol`) menunjukkan `requestPrint()` memanggil `_update(ownerAddress, address(this))` untuk transfer NFT ke vault. **Tapi deployed contract TIDAK melakukan transfer** — hanya set `cardStatus=Vaulted` + `storedHash`.

**Bukti on-chain (28 Juli 2026):**
- 39/40 token: `balanceOf(lastOwner)=1`, `balanceOf(contract)=0` — NFT di wallet user
- 1/40 token (14): `balanceOf(lastOwner)=0`, `balanceOf(contract)=1` — NFT di vault

**Implikasi**: NFT "terkunci" di wallet user oleh `_update` override yang blokir transfer saat Vaulted. Bukan dipindah ke vault.

### TokenId Scope per Kontrak

- Sprint 2 contract: tokenId 1-3 (test data, kontrak sudah tidak dipakai)
- Sprint 3 contract: tokenId 1-4 (test data, kontrak sudah tidak dipakai)
- Current contract: tokenId 1-40 (40 kartu, tersebar di beberapa user wallet)

---

## 2. Rencana Clean-Slate

### Tujuan
Semua kartu yang didemokan di Demo Day harus:
1. Berada di kontrak AKTIF (`0xe62bC7c470EAEf3FCAd1816b9AC6d63D585B5EE8`)
2. Memiliki tokenId yang valid dan bisa di-verify on-chain
3. Tidak bercampur dengan data test lama

### Langkah-langkah

#### Step 1: Backup Data Lama (Opsional)
```bash
# Export MongoDB collections untuk arsip
# (via mongodump atau MongoDB Atlas UI)
```

#### Step 2: Bersihkan Database
Hapus/arsipkan data lama dari collection:
- `users` — keep, tapi buat user demo baru
- `cards` — hapus semua, akan diisi ulang
- `transactions` — hapus semua, akan diisi ulang
- `redeem_codes` — hapus semua, akan diisi ulang
- `rate_limits` — hapus semua
- `card_templates` — keep (template tidak berubah)

#### Step 3: Mint Kartu Baru
Beli pack baru (via `/api/mint`) untuk user demo. Semua kartu baru akan:
- Punya tokenId baru (mulai dari 41+ di kontrak aktif)
- Tercatat dengan `contractAddress` field
- Bersih dari data kontrak lama

#### Step 4: Test Full Loop
1. Mint pack → 8 kartu Digital
2. Request Print → kartu Vaulted (status on-chain)
3. Admin Accept → kartu Real
4. Redeem → kartu Digital kembali

#### Step 5: Verify On-Chain
Untuk setiap kartu demo, verifikasi:
```bash
cast call <CONTRACT> "cardStatus(uint256)(uint8)" <tokenId> --rpc-url bsc_testnet
cast call <CONTRACT> "balanceOf(address,uint256)(uint256)" <userWallet> <tokenId> --rpc-url bsc_testnet
```

---

## 3. Keputusan: Redeploy Contract?

### Opsi A: Pakai Kontrak yang Ada
- **Pro**: Tidak perlu redeploy, tidak ada risiko error
- **Con**: `requestPrint` tidak transfer NFT (hanya lock di wallet user)
- **Risiko rendah**: Untuk demo, behavior ini cukup — user tetap tidak bisa transfer kartu yang sudah di-print

### Opsi B: Redeploy dengan Source Code yang Benar
- **Pro**: NFT benar-benar pindah ke vault saat print
- **Con**: Butuh redeploy + update `.env.local` + update Vercel + mint ulang SEMUA kartu
- **Risiko tinggi**: Bisa break existing flow, butuh testing ulang

### Rekomendasi: **Opsi A** (pakai kontrak yang ada)
Untuk Demo Day, behavior saat ini sudah cukup:
- User tidak bisa transfer kartu Vaulted (sudah di-lock)
- Admin bisa accept print
- Redeem tetap berfungsi
- Tidak ada risiko "kartu hilang" karena NFT tetap di wallet user

Redeploy kontrak (Opsi B) bisa dilakukan post-hackathon untuk production.

---

## 4. Checklist Pre-Demo Day

- [ ] Bersihkan database (hapus data test lama)
- [ ] Buat user demo baru
- [ ] Mint 1-2 pack (8-16 kartu)
- [ ] Test full loop: mint → print → accept → redeem
- [ ] Verify on-chain untuk semua kartu demo
- [ ] Pastikan admin console berfungsi
- [ ] Pastikan QR scan berfungsi
- [ ] Pastikan Profile page redeem berfungsi dengan rate-limit

---

*Plan ini disusun setelah investigasi root cause Poin 3 (28 Juli 2026).*
