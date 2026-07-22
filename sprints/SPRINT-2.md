# Sprint 2 — Core Mint (22 Juli 2026)

## Goal
Core mint function jalan di testnet. Bagian ini TIDAK BOLEH gagal (prioritas #1, lihat MEMORY.md).

## Tasks
- [x] Setup wallet testnet + claim faucet BNB testnet (0.05 tBNB)
- [x] Setup Foundry project (v1.7.1 + OpenZeppelin v5)
- [x] Smart contract BEP-1155 (`GachardCard.sol`) dengan `mintCard(address,uint8 rarity)`, status default `Digital`
- [x] Deploy kontrak ke BNB Testnet: `0xc7d37b43fa706c646f89b19b78b9c2329925731c`
- [x] Test mint di testnet (3 kartu: Common, Rare, Epic) — verifikasi di block explorer
- [x] Integrasi frontend: API route `POST /api/mint` dengan odds table + card templates + pola async
- [ ] Commit ke GitHub (perlu dilakukan manual)

## Definition of Done
- [x] Mint berhasil, token terlihat di block explorer
- [x] Status `Digital` tercatat benar per token
- [x] Rarity tercatat benar per token (Common=0, Rare=1, Epic=2)
- [x] Frontend build sukses dengan integrasi kontrak

## Laporan Detail
Lihat `docs/compose/reports/sprint-2-final.md`

## Rencana Eksekusi
Lihat `docs/compose/plans/2026-07-22-sprint-2-core-mint.md`

## STOP
Summarize and wait for review.
