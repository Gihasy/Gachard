# Sprint 5 — Fitur AI Scan (23 Juli 2026)

## Goal
Fitur AI scan — wajib untuk tema hackathon "AI x Web3".

## Tasks
- [x] QR/kode lookup dari kartu ke `tokenId` — `/api/cards/:tokenId/qr`
- [x] `/api/scan` endpoint — on-chain data + off-chain data + history + verification flag
- [x] Scan page — card detail dengan verification ✅/⚠️
- [x] QR display di CardItem (Show QR button)
- [x] purchasePrice di scan response (dari mint transaction)
- [x] tokenIds array di mintBatch transaction + history query
- [x] card-artwork-guideline: QR info-scan terpisah dari redeem code
- [ ] Integrasi AI vision (opsional — fallback ke QR lookup)

## Definition of Done
- [x] Scan kartu menghasilkan data akurat (rarity, status, owner, history)
- [x] Flag verifikasi tampil sesuai kondisi kartu
- [x] QR code bisa di-generate dan di-scan

## Laporan Detail
- Plan: `docs/compose/plans/2026-07-23-sprint-5-ai-scan.md`

## STOP
Summarize and wait for review.
