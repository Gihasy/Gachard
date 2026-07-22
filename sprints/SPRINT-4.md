# Sprint 4 — Sistem Credit & UI Utama (10–16 Agustus 2026)

## Goal
Sistem credit dual-track + UI utama yang bisa dipakai end-to-end.

## Tasks
- [ ] `creditBalance` di database, `topUpCredits()` via Stripe test-mode (lihat ADR-008)
- [ ] `buyPack()` — potong saldo credit, tanpa panggilan Stripe berulang
- [ ] `requestPrint()` — tetap wajib direct payment Stripe terpisah, tidak bisa pakai credit
- [ ] Build UI utama: Home, Buy Pack, Reveal, Koleksi, Request Print flow
- [ ] Placeholder Marketplace "Coming Soon" (lihat ADR-010)

## Definition of Done
- Top up credit berhasil lewat Stripe test-mode
- Beli pack memotong saldo credit tanpa checkout berulang
- Request print tetap meminta pembayaran terpisah
- UI utama bisa dipakai end-to-end tanpa error blocking

## STOP
Summarize and wait for review.
