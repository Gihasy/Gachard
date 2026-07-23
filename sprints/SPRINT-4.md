# Sprint 4 — Sistem Credit & UI Utama (23 Juli 2026)

## Goal
Sistem credit dual-track + UI utama yang bisa dipakai end-to-end.

## Tasks
- [x] `creditBalance` di database, `topUpCredits()` via simulated Stripe (ADR-008)
- [x] `buyPack()` — potong saldo credit, refund jika mint gagal
- [x] `requestPrint()` — direct payment terpisah (simulated Stripe checkout)
- [x] Build UI utama: Home (inline reveal), Top Up, Koleksi (card grid + Request Print), Marketplace
- [x] Placeholder Marketplace "Coming Soon" (ADR-010)
- [x] `confirmTransaction()` extracts tokenId from CardMinted event
- [x] `GET /api/cards` dengan artworkUrl lookup dari card_templates

## Definition of Done
- [x] Top up credit berhasil (simulated Stripe)
- [x] Beli pack memotong saldo credit
- [x] Request print tetap meminta pembayaran terpisah
- [x] UI utama bisa dipakai end-to-end tanpa error blocking

## Laporan Detail
- Gap fixes: `docs/compose/reports/sprint-4-gap-fixes.md`
- Rencana: `docs/compose/plans/2026-07-22-sprint-4-credit-ui.md`

## STOP
Summarize and wait for review.
