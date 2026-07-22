# Sprint 3 — Vault / Print / Redeem State Machine (3–9 Agustus 2026)

## Goal
Bagian paling kritis dari seluruh produk: mekanisme lock-vault-redeem.

## Tasks
- [ ] `requestPrint()` — generate kode+hash baru, overwrite hash lama, status → `Vaulted`, transfer ke alamat vault (lihat ADR-004, ADR-005)
- [ ] `redeemCard()` — cek status + hash, transfer ke `recipientAddress` eksplisit, backend rate-limiting (lihat ADR-006, ADR-007)
- [ ] Test end-to-end: mint → print → redeem, ulangi 2–3 siklus pada token yang sama, pastikan hash lama benar-benar invalid
- [ ] Mulai cetak kartu fisik sample (printer + kertas foto + stiker scratch-off) — jangan tunda ke minggu terakhir

## Definition of Done
- Full loop mint→print→redeem berhasil di testnet
- Hash lama terverifikasi tidak valid setelah siklus print baru
- Kartu fisik sample sudah dicetak

## STOP
Summarize and wait for review.
