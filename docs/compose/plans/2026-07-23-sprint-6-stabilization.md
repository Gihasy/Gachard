# Sprint 6 — Stabilisasi & Persiapan Pitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilisasi core loop, polish UI/UX, persiapan pitch deck dan video demo untuk hackathon.

**Architecture:** Tidak ada perubahan arsitektur. Fokus pada bug fixing, UI polish, dan dokumentasi demo.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, MongoDB, ethers.js

## Global Constraints

- TIDAK ada fitur baru — hanya stabilisasi dan polish (PRD §10)
- Core mint–vault–redeem TIDAK BOLEH dipotong (PRD §10)
- Solo developer, ~14 jam/minggu (MEMORY.md)
- Marketplace tetap "Coming Soon" (ADR-010)
- AI Vision di-skip (Gemini quota issues)

---

## Task 1: Audit Core Loop — End-to-End Test

**Covers:** Sprint 6 Definition of Done — "Tidak ada known-bug kritis"

**Files:**
- Tidak ada file baru — hanya testing

- [ ] **Step 1: Test full flow di Vercel (manual)**

Lakukan test berikut di https://frontend-rosy-pi-88.vercel.app:

1. **Top Up**: Login → Top Up 1000 Credit → verifikasi balance
2. **Buy Pack**: Home → Buy Pack → verifikasi 8 kartu muncul dengan artwork
3. **Koleksi**: Buka Koleksi → verifikasi 8 kartu dengan tokenId terisi
4. **Request Print**: Klik "Request Print" pada 1 kartu → verifikasi tx pending → tunggu konfirmasi → verifikasi status Vaulted
5. **Scan**: Buka `/scan?tokenId=X` → verifikasi metadata lengkap
6. **QR**: Klik "Show QR" → verifikasi QR code muncul

- [ ] **Step 2: Catat semua bug yang ditemukan**

Buat list bug di `docs/compose/reports/sprint-6-bug-list.md`:
- Bug description
- Steps to reproduce
- Expected vs actual behavior
- Severity (critical/high/medium/low)

- [ ] **Step 3: Fix critical/high bugs**

Prioritas fix:
1. Core loop bugs (mint → print → redeem)
2. UI rendering bugs
3. Data consistency bugs

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: [deskripsi bug yang di-fix]"
```

---

## Task 2: UI/UX Polish

**Covers:** PRD §10 (polish UI/UX)

**Files:**
- Modify: `frontend/app/page.tsx` (Home)
- Modify: `frontend/app/koleksi/page.tsx` (Koleksi)
- Modify: `frontend/app/scan/page.tsx` (Scan)
- Modify: `frontend/components/Navbar.tsx`
- Modify: `frontend/app/globals.css` (Tailwind)

- [ ] **Step 1: Loading states**

Tambahkan loading spinner yang konsisten di semua page:
- Home: loading saat fetch balance
- Koleksi: loading saat fetch cards
- Scan: loading saat fetch scan data
- Top Up: loading saat proses top-up

- [ ] **Step 2: Error states**

Tambahkan error message yang user-friendly:
- Network error → "Koneksi bermasalah, coba lagi"
- Insufficient credit → "Saldo tidak cukup, top up dulu"
- Card not found → "Kartu tidak ditemukan"

- [ ] **Step 3: Empty states**

- Koleksi kosong → "Belum ada kartu. Beli pack di Home!" + link
- Scan tanpa tokenId → manual input + instruksi scan QR

- [ ] **Step 4: Responsive design check**

Pastikan semua page tampil baik di:
- Desktop (1920x1080)
- Tablet (768px)
- Mobile (375px)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "polish: UI/UX improvements for demo readiness"
```

---

## Task 3: Smart Contract Review

**Covers:** Sprint 6 Tasks — "Mentor review khusus logika vault/redeem"

**Files:**
- Review: `contracts/src/GachardCard.sol`
- Review: `contracts/test/GachardCard.t.sol`

- [ ] **Step 1: Review vault/redeem logic**

Checklist review:
- [ ] `requestPrint()` — status Digital → Vaulted, hash overwrite, transfer ke vault
- [ ] `redeemCard()` — cek hash, status Vaulted → Digital, transfer ke recipient
- [ ] `_update()` override — block transfer saat Vaulted
- [ ] `mintBatch()` — atomik, semua atau tidak sama sekali
- [ ] Stored hash overwrite (ADR-005) — hash lama benar-benar ditimpa
- [ ] Rate-limiting (ADR-006) — di backend, bukan on-chain
- [ ] Recipient address eksplisit (ADR-007) — bukan msg.sender

- [ ] **Step 2: Run all tests**

```bash
cd contracts && forge test -vvv
```

Expected: 31/31 pass

- [ ] **Step 3: Document review findings**

Tambahkan hasil review ke `docs/compose/reports/sprint-6-contract-review.md`

---

## Task 4: Draft Pitch Deck

**Covers:** Sprint 6 Tasks — "Draft pitch deck"

**Files:**
- Create: `docs/pitch-deck-outline.md`

**Bahan:**
- `docs/00-project-overview.md` — problem, solution, differentiator
- `DECISIONS.md` — 20 ADR
- `PRD-Gachard-Hackathon.md` — scope, fitur

- [ ] **Step 1: Buat outline pitch deck**

```markdown
# Gachard Pitch Deck Outline

## Slide 1: Title
- Logo Gachard
- Tagline: "Digital-to-Physical TCG Platform"
- Track: Consumer Apps — Indonesia Web3 Hackathon 2026

## Slide 2: Problem
- Grading otentikasi mahal (PSA)
- Kartu digital sulit dibuktikan keasliannya

## Slide 3: Solution
- Kartu digital-native sejak lahir
- Lock-vault-redeem tanpa burn
- Blockchain hidden dari user

## Slide 4: Demo Flow
- Login → Buy Pack → Reveal → Koleksi → Request Print → Scan QR

## Slide 5: Architecture
- Next.js single service (Vercel)
- MongoDB Atlas
- BNB Testnet + BEP-1155
- AES-256-GCM encryption

## Slide 6: AI Integration
- QR scan + verification flag
- (AI Vision: roadmap, bukan demo)

## Slide 7: Differentiator
- vs Courtyard: digital-native, bukan tokenisasi kartu fisik
- Blockchain hidden dari user
- Dual payment (credit + direct)

## Slide 8: Roadmap
- Hackathon: core loop + AI scan
- Post-hackathon: marketplace, multi-brand, produksi

## Slide 9: Ask
- Mentor feedback
- Partnership dengan brand/IP
```

- [ ] **Step 2: Review dan polish**

Pastikan setiap slide:
- 1 pesan utama
- Visual yang mendukung
- Tidak lebih dari 3 bullet points

- [ ] **Step 3: Commit**

```bash
git add docs/pitch-deck-outline.md
git commit -m "docs: add pitch deck outline"
```

---

## Task 5: Video Backup

**Covers:** Sprint 6 Tasks — "Rekam video backup satu siklus redeem"

- [ ] **Step 1: Persiapan**

- Pastikan ada 1 kartu dengan status Digital
- Pastikan ada saldo credit untuk beli pack baru (opsional)
- Siapkan screen recording software

- [ ] **Step 2: Rekam siklus lengkap**

Rekam layar saat melakukan:
1. Login
2. Top Up credit
3. Buy Pack → reveal 8 kartu
4. Koleksi → lihat kartu
5. Request Print → tunggu konfirmasi
6. Scan QR → lihat metadata
7. Redeem → kartu kembali Digital

- [ ] **Step 3: Simpan video**

Simpan di `docs/demo-video/` atau Google Drive

---

## Task 6: Final Deploy & Verification

- [ ] **Step 1: Final build**

```bash
cd frontend && npm run build
```

- [ ] **Step 2: Final deploy**

```bash
npx vercel --prod
```

- [ ] **Step 3: Smoke test di production**

Verifikasi semua endpoint:
- `/api/health` → OK
- `/api/scan?tokenId=1` → response lengkap
- `/api/cards/:tokenId/qr` → PNG

- [ ] **Step 4: Update MEMORY.md**

```markdown
- Sprint 6: SELESAI
  - [x] Bug fixing
  - [x] UI/UX polish
  - [x] Smart contract review
  - [x] Draft pitch deck
  - [x] Video backup
  - [x] Final deploy
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "sprint-6: stabilization + pitch deck + video backup complete"
```

---

## Checklist Sprint 6 Definition of Done

| Kriteria | Verifikasi |
|---|---|
| Tidak ada known-bug kritis | Bug list + fixes |
| Draft pitch deck siap | `docs/pitch-deck-outline.md` |
| Video backup tersedia | Screen recording |
| UI/UX polished | Manual testing |
| Contract reviewed | Review report |

---

*Plan ini disusun untuk review sebelum eksekusi Sprint 6.*
