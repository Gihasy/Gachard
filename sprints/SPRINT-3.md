# Sprint 3 — Vault / Print / Redeem State Machine (22 Juli 2026)

## Goal
Bagian paling kritis dari seluruh produk: mekanisme lock-vault-redeem.

## Tasks
- [x] `requestPrint()` — generate kode+hash baru, overwrite hash lama, status → `Vaulted`, transfer ke alamat vault (ADR-004, ADR-005)
- [x] `redeemCard()` — cek status + hash, transfer ke `recipientAddress` eksplisit, backend rate-limiting (ADR-006, ADR-007)
- [x] Test end-to-end: mint → print → redeem, 3 siklus pada token yang sama, hash lama verified invalid on-chain
- [x] API routes: `/api/print` + `/api/redeem` dengan rate-limiting + enkripsi code
- [ ] Mulai cetak kartu fisik sample (printer + kertas foto + stiker scratch-off) — jangan tunda ke minggu terakhir

## Definition of Done
- [x] Full loop mint→print→redeem berhasil di testnet
- [x] Hash lama terverifikasi tidak valid setelah siklus print baru (tested on-chain: "Invalid redeem code")
- [ ] Kartu fisik sample sudah dicetak

## On-Chain Verification
- Kontrak: `0x122ace919d9da1ddb736ce6c0db6f00638ab0637`
- requestPrint siklus 2: `0x176eb7beefd092f4b1676311965119142624ca696a726a19bd4d65bd41794987`
- redeemCard hash lama: REVERT "Invalid redeem code"
- redeemCard hash baru: `0xc953c8f3e0932596ceaaf94238ff4a53f2e2969ec8e3e53a90ac8c63a515a0f7`

## Laporan Detail
Lihat `docs/compose/reports/sprint-3-final.md`

## Rencana Eksekusi
Lihat `docs/compose/plans/2026-07-22-sprint-3-vault-print-redeem.md`

## STOP
Summarize and wait for review.
