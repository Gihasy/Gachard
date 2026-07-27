# Pack System Redesign — Design Spec
**Tanggal**: 28 Juli 2026

## [S1] Pack Types & Pricing

| Pack | Harga | Kartu | Guaranteed Rare+ |
|------|-------|-------|-----------------|
| Standard | 500 Credit ($5) | 5 | 1 |
| Booster | 800 Credit ($8) | 10 | 2 |

Odds table tetap sama (Common 70%, Rare 20%, Epic 8%, Legendary 2%). Guaranteed Rare+ mengambil dari pool Rare/Epic/Legendary.

## [S2] /packs Page Layout

Page `/packs` menampilkan:
- 2 pack card berdampingan (Standard kiri, Booster kanan)
- Setiap card: gambar pack, nama, harga, jumlah kartu, jumlah Rare+
- Button "Buy & Open" di setiap card
- Balance credit user saat ini di bawah
- Responsive: desktop side-by-side, mobile stacked

## [S3] Opening Flow & Animation

**Flow:**
1. User klik "Buy & Open" → API call ke `/api/mint` dengan parameter `packType`
2. Loading state saat menunggu response
3. Setelah sukses → tampilan "Pack Ready!" dengan gambar pack di tengah
4. User klik "Open" → animasi:
   - Pack image shake/glow → terbuka (split animation)
   - Kartu muncul satu per satu dengan flip animation (0.5s interval)
   - Back → front flip dengan artwork + rarity glow
   - Rarity lebih tinggi = glow lebih dramatic
   - Setelah semua reveal → grid final
5. Button "View in Collection"

**Teknis:**
- CSS animations (transform: rotateY, scale, opacity)
- State machine: idle → loading → ready → revealing → done
- Reveal dari rarity terendah ke tertinggi (build suspense)

## [S4] API Changes

**`/api/mint`** — modifikasi:
```
POST { userId, packType: "standard" | "booster" }
```

| packType | cards | price | guaranteedRarePlus |
|----------|-------|-------|-------------------|
| standard | 5 | 500 | 1 |
| booster | 10 | 800 | 2 |

Response: `{ status, txId, cards, newBalance }`

`buildPackRarities(packSize, guaranteedCount)` di `lib/odds.ts` dimodifikasi.

## [S5] Perubahan File

| File | Perubahan |
|------|-----------|
| `app/packs/page.tsx` | Full rewrite: 2 pack cards + opening animation |
| `lib/odds.ts` | `buildPackRarities(packSize, guaranteedCount)` — parameterize |
| `app/api/mint/route.ts` | Accept `packType`, dynamic price + card count |
| `components/PackCard.tsx` | Update: support 2 variants (Standard/Booster) |
| `components/PackReveal.tsx` | Rewrite: flip animation, sequential reveal |
| `app/page.tsx` | Remove buy flow (pindah ke /packs), keep hero + sections |

**Tidak diubah:** blockchain.ts, credits.ts, transactions.ts, admin routes, smart contract.
