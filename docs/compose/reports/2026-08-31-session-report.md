# Session Report — 31 Agustus 2026

**Branch:** `feat/ai-anomaly-detection-oracle`
**Production:** https://www.gachard.com
**Duration:** Full session
**Commits:** 10 | **Files modified:** 20+

---

## Executive Summary

Sesi ini mencakup 3 kategori besar: **UI/Bug Fixes** (7 tasks), **Performance Optimization** (7 tasks), dan **Security Audit + Fixes** (6 fixes applied + 16 remaining). Juga dilakukan smart contract audit yang menemukan 2 critical vulnerabilities.

---

## 1. UI Improvements & Copywriting

### 1.1 Creators Page — Form Visibility
**Commit:** `b93be0c`

| Before | After |
|--------|-------|
| `style jsx` inline di Field component | `.form-field` class di `globals.css` |
| Border `rgba(255,255,255,0.12)` — hampir tidak terlihat | `var(--border-strong)` (0.16 opacity) — jelas terlihat |
| Background `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.06)` |
| Focus: border violet saja | Focus: violet border + glow ring (`box-shadow`) |
| Labels `text-white/50` | Labels `font-weight: 600`, `var(--silver-mist-dim)` |

### 1.2 Creators Page — Copywriting Rewrite
**Commit:** `c679520`

| Element | Before | After |
|---------|--------|-------|
| Hook | "The Studio Is Opening Soon" | "Turn Your Fans Into **Collectors**" |
| Description | Corporate, panjang | "Got a world people love? Gachard lets you turn it into real, tradeable cards..." |
| Revenue Share | "70/30 Revenue Share" | "Revenue Share" |
| Zero Upfront | "handle minting" | "handle card creation" |
| Ownership | "verifiable, tradeable cards" | "Your fans don't just save a JPEG..." |
| Form subtitle | "Tell us about your IP" | "Drop your info below..." |
| Success | "You're on the list!" | "You're In!" |

### 1.3 Hapus Terminologi Blockchain
**Commit:** `fa6ad75`
- "no blockchain headaches" → "no complicated tech"
- "handle minting" → "handle card creation"
- Scan seluruh halaman creators — 0 kata blockchain/crypto/web3/NFT tersisa

### 1.4 Profile Page — Tombol "Become a Creator"
**Commit:** `543f4f2`
- "Top Up" (header, sebelah Log out) → "Become a Creator" → `/creators`
- "Top Up" (sebelah balance Crystal) tetap tidak diubah

### 1.5 Footer Improvement
**Commit:** `3c1752d`
- Layout: 2 kolom → 3 kolom (Brand | Product | Community)
- Social media icons: TikTok, YouTube, X, Instagram (@gachardtcg)
- Hover effect: scale 1.1x + color change
- "@gachardtcg" universal handle di bawah icons

---

## 2. Bug Fixes

### 2.1 Cancel Listing → "Listing not found"
**Commit:** `38eac02`

**Root cause:** Listing document tidak ada di collection `listings` (mungkin dari clean-slate atau data inconsistency), tapi card masih `isListed: true` dengan `listingId` stale.

**Fix:** Kalau listing tidak ditemukan, otomatis bersihkan stale reference pada card (`isListed: false`, hapus `listingId`) dan return success. Card langsung kembali normal.

### 2.2 Cancel → List lagi → "Card is already listed"
**Commit:** `e43dc7f`

**Root cause:** Cancel endpoint mengupdate listing status ke "cancelled" tapi card update gagal secara silent. Listing POST cuma cek `card.isListed` dari MongoDB tanpa verifikasi listing benar-benar ada.

**Fix (2 perubahan):**
1. **Listing POST:** Kalau `isListed` true, verifikasi listing benar-benar active. Kalau tidak (stale), self-heal dan izinkan listing baru.
2. **Cancel POST:** Cleanup pakai dua cara — by `cardId` dari listing DAN by `listingId` di card.

---

## 3. Transaction Data Consistency

**Commit:** `9b098ff`

### Transaction Interface Extended
```typescript
// Added fields:
tokenIds?: number[];
rarities?: number[];
templateIds?: string[];
purchasePrice?: number;
contractAddress?: string;
type: "mint" | "print" | "redeem" | "transfer" | "topup" | "dismantled" | "sold" | "listed";
```

### Per-Route Changes

| Route | Added Fields |
|-------|-------------|
| `api/print/route.ts` | `tokenIds`, `rarities`, `templateIds` |
| `api/redeem/route.ts` | `tokenIds`, `rarities`, `templateIds` |
| `api/dismantle/route.ts` | `tokenIds`, `rarities`, `templateIds` |
| `api/credits/topup/route.ts` | Fix: status langsung `"confirmed"` (bukan stuck `"pending"`) |

### Status Akhir

| Type | txHash | tokenIds | templateIds | rarities | Status |
|------|--------|----------|-------------|----------|--------|
| mint | ✅ | ✅ | ✅ | ✅ | ✅ |
| print | ✅ | ✅ | ✅ | ✅ | ✅ |
| redeem | ✅ | ✅ | ✅ | ✅ | ✅ |
| dismantle | ✅ | ✅ | ✅ | ✅ | ✅ |
| trade (sold) | ✅ | ✅ | ✅ | ✅ | ✅ |
| listed | N/A | ✅ | ✅ | ✅ | ✅ |
| topup | N/A | N/A | N/A | N/A | ✅ fixed |

---

## 4. Performance Optimization

**Commit:** `091eac7`

### 4.1 Database (MongoDB)

| Optimisasi | Detail | Impact |
|-----------|--------|--------|
| **25 indexes** | cards (7), listings (4), transactions (4), users (2), templates (2), crystal_balances (1), supporters (1), redeem_codes (2), rate_limits (1) | Query 10-100x lebih cepat saat data grow |
| **Connection pooling** | maxPoolSize: 10, minPoolSize: 2, maxIdleTimeMS: 30s | Mengurangi latency connection |
| **Template query** | Hanya fetch template yang dibutuhkan (`$in` filter) | Mengurangi data transfer |

### 4.2 API Routes (Backend)

| Optimisasi | File | Before → After |
|-----------|------|----------------|
| Parallel confirms | `api/cards/route.ts` | Sequential loop → `Promise.allSettled` |
| Parallel dismantle | `api/dismantle/route.ts` | 2 sequential → 1 `Promise.all` |
| Parallel print | `api/print/route.ts` | 2 sequential → 1 `Promise.all` |
| Parallel clean-slate | `api/admin/clean-slate/route.ts` | N sequential → 1 `Promise.all` |
| Cancel route | `api/marketplace/listings/[id]/cancel/route.ts` | 2 `updateMany` → 1 `$or` query |

### 4.3 Frontend (Next.js)

| Optimisasi | Detail |
|-----------|--------|
| **Caching headers** | `/_next/static/**` → immutable 1 year |
| **Image cache TTL** | 30 hari (dari default 60 detik) |
| **optimizePackageImports** | `["ethers"]` — mengurangi bundle size |
| **Remove "use client"** | 7 static components: Footer, HomeHero, HomeWhyGachard, HomeCtaBand, HomeHowItWorks, HomeFeaturedCards, HomeCoreLoop |
| **Navbar scroll throttle** | `requestAnimationFrame` — mengurangi re-render saat scroll |

---

## 5. Security Audit

### 5.1 Frontend — 24 Temuan

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 3 | Secrets in repo, Mass IDOR (no session auth), No API auth middleware |
| **HIGH** | 6 | Weak encryption key, Key reuse, Unlimited topup, No ownership check, Unprotected seeds, Missing rate limiting |
| **MEDIUM** | 7 | Vercel tokens, Timing attack, GET for destructive op, Unauth wishlist, No CORS, Missing headers, Brute-forceable claimId |
| **LOW** | 8 | Various minor issues |

### 5.2 Smart Contract — 12 Temuan

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 2 | `redeemCard` duplicate tokens (C-1), `requestPrint` no owner validation (C-2) |
| **HIGH** | 2 | `redeemCard` permissionless (H-1), `lastOwner` stale on transfer (H-2) |
| **MEDIUM** | 3 | No address(0) validation, `_update` vs `_updateWithAcceptanceCheck` |
| **LOW** | 3 | No batch size limit, No events, `renounceOwnership` risk |
| **INFO** | 2 | Empty URI, Single-step ownership transfer |

### 5.3 Fixes Applied

| # | Fix | Severity | Commit |
|---|-----|----------|--------|
| 1 | Security headers (X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy) | MEDIUM | `7d76266` |
| 2 | Timing-safe admin auth (constant-time comparison, Edge Runtime compatible) | MEDIUM | `b105ff7` |
| 3 | Card ownership check di print/checkout | HIGH | `7d76266` |
| 4 | Rate limiting di creator-applications (5/min per IP) | MEDIUM | `7d76266` |
| 5 | Hapus GET handler dari clean-slate (hanya POST) | MEDIUM | `7d76266` |
| 6 | Health endpoint tidak expose error message | LOW | `7d76266` |

### 5.4 Remaining Issues (Butuh Arsitektur Change)

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Server-side session management (fix IDOR massal) | CRITICAL | Large |
| 2 | API auth middleware | CRITICAL | Medium |
| 3 | Generate random encryption key | HIGH | Small |
| 4 | Pindahkan seed endpoints ke `/api/admin/` | HIGH | Small |
| 5 | Payment verification untuk topup | HIGH | Medium |
| 6 | Rate limiting ke 13+ endpoints | HIGH | Medium |
| 7 | CORS configuration | MEDIUM | Small |
| 8 | Smart contract fixes + redeploy | CRITICAL | Large |

---

## 6. Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `b93be0c` | fix: improve waitlist form visibility |
| 2 | `c679520` | fix: friendlier copywriting on creators page |
| 3 | `fa6ad75` | fix: remove blockchain/minting terminology |
| 4 | `38eac02` | fix: cancel listing handles missing listing |
| 5 | `e43dc7f` | fix: self-heal stale isListed |
| 6 | `543f4f2` | feat: replace Top Up with Become a Creator |
| 7 | `3c1752d` | feat: improve footer with social media icons |
| 8 | `9b098ff` | feat: consistent transaction metadata |
| 9 | `091eac7` | perf: comprehensive optimization |
| 10 | `7d76266` | security: add headers, timing-safe auth, ownership check |
| 11 | `b105ff7` | fix: Edge Runtime compatible constant-time comparison |

---

## 7. Files Modified

### Components
- `frontend/components/Footer.tsx` — 3-column layout + social icons
- `frontend/components/Navbar.tsx` — scroll throttle
- `frontend/components/home/HomeCoreLoop.tsx` — remove "use client"
- `frontend/components/home/HomeWhyGachard.tsx` — remove "use client"
- `frontend/components/home/HomeCtaBand.tsx` — remove "use client"
- `frontend/components/home/HomeHowItWorks.tsx` — remove "use client"
- `frontend/components/home/HomeFeaturedCards.tsx` — remove "use client"
- `frontend/components/home/HomeHero.tsx` — remove "use client"

### Pages
- `frontend/app/creators/page.tsx` — form + copywriting
- `frontend/app/profile/page.tsx` — Become a Creator button

### API Routes
- `frontend/app/api/cards/route.ts` — parallel confirms, template query
- `frontend/app/api/dismantle/route.ts` — parallel ops, tx metadata
- `frontend/app/api/print/route.ts` — parallel ops, tx metadata
- `frontend/app/api/redeem/route.ts` — tx metadata
- `frontend/app/api/credits/topup/route.ts` — fix stuck pending
- `frontend/app/api/marketplace/listings/route.ts` — template query, self-heal
- `frontend/app/api/marketplace/listings/[id]/cancel/route.ts` — combined updates
- `frontend/app/api/admin/clean-slate/route.ts` — parallel deletes, remove GET
- `frontend/app/api/creator-applications/route.ts` — rate limiting
- `frontend/app/api/print/checkout/route.ts` — ownership check
- `frontend/app/api/health/route.ts` — sanitize errors

### Core
- `frontend/lib/mongodb.ts` — indexes + connection pooling
- `frontend/lib/transactions.ts` — extended interface
- `frontend/next.config.ts` — headers, cache, optimizePackageImports
- `frontend/middleware.ts` — timing-safe auth
- `frontend/app/globals.css` — form-field styles

---

## 8. Next Session Priorities

1. **Smart contract fixes** — C-1, C-2, H-1, H-2 + redeploy
2. **Session management** — server-side session untuk fix IDOR
3. **Rate limiting** — tambah ke semua state-changing endpoints
4. **Encryption key** — generate random key, rotate
5. **Seed endpoints** — pindahkan ke `/api/admin/` atau hapus dari production
