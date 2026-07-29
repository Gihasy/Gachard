# Session Changelog — 29 July 2026

**Branch:** `main`  
**Commits:** 5 (bb361f8, a869e34, e172f1b, c0c97b0, 9dbbc84)  
**Files changed:** 21 (326 insertions, 248 deletions)

---

## Daftar Isi

1. [Middleware Fix (CRITICAL)](#1-middleware-fix-critical)
2. [Open Redirect Fix (CRITICAL)](#2-open-redirect-fix-critical)
3. [ObjectId Validation](#3-objectid-validation)
4. [Input Validation — Auth & Topup](#4-input-validation--auth--topup)
5. [Misc Bug Fixes](#5-misc-bug-fixes)
6. [Dead Code Removal](#6-dead-code-removal)
7. [Vercel Build Configuration](#7-vercel-build-configuration)
8. [Guest Access — Packs Page](#8-guest-access--packs-page)
9. [Environment Variables — Vercel](#9-environment-variables--vercel)
10. [Deployment History](#10-deployment-history)

---

## 1. Middleware Fix (CRITICAL)

**Commit:** `c0c97b0`  
**File:** `frontend/proxy.ts` → `frontend/middleware.ts`

### Masalah
File `proxy.ts` mengekspor function `proxy()`, tapi Next.js mengharuskan middleware di file `middleware.ts` dengan export `middleware`. Akibatnya **seluruh route protection tidak berjalan** — semua protected routes (`/collection`, `/profile`, `/topup`) dan admin routes (`/admin/*`, `/api/admin/*`) bisa diakses tanpa autentikasi.

### Perubahan
```diff
- export function proxy(req: NextRequest) {
+ export function middleware(req: NextRequest) {
```

File di-rename dari `proxy.ts` ke `middleware.ts`.

### Dampak
- Auth guard untuk protected user routes aktif (cookie `gachard_uid`)
- HTTP Basic Auth untuk admin routes aktif (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Unauthenticated user → redirect ke `/login`

---

## 2. Open Redirect Fix (CRITICAL)

**Commit:** `c0c97b0`  
**File:** `frontend/app/login/page.tsx`

### Masalah
Parameter `next` dari URL digunakan langsung di `window.location.href = next` tanpa validasi. Attacker bisa buat link `/login?next=https://evil.com` untuk redirect user ke situs malicious setelah login.

### Perubahan
Tambah function `safeNext()`:
```typescript
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
```

Digunakan di 3 tempat: `window.location.href = next` (Google login, Demo login).

### Dampak
- Hanya relative path yang diizinkan (mulai dengan `/`)
- Protocol-relative URLs (`//evil.com`) diblokir
- Absolute URLs (`https://evil.com`) diblokir

---

## 3. ObjectId Validation

**Commit:** `c0c97b0`  
**Files:** `lib/mongodb.ts`, `api/cards/route.ts`, `api/mint/route.ts`, `api/print/route.ts`, `api/print/checkout/route.ts`, `api/redeem/route.ts`

### Masalah
5 API routes memanggil `new ObjectId(userId)` tanpa validasi. Jika `userId` tidak valid (bukan 24-char hex), MongoDB throw error dan menghasilkan generic 500 error.

### Perubahan
Tambah helper `parseObjectId()` di `lib/mongodb.ts`:
```typescript
export function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid ID format");
  }
  return new ObjectId(id);
}
```

Semua 5 API routes diupdate:
```diff
- const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
+ const user = await usersCollection.findOne({ _id: parseObjectId(userId) });
```

### Dampak
- Invalid ID → clear 400 error "Invalid ID format"
- Validasi terjadi sebelum query MongoDB

---

## 4. Input Validation — Auth & Topup

**Commit:** `c0c97b0`  
**Files:** `api/auth/google/route.ts`, `api/credits/topup/route.ts`, `api/mint/route.ts`

### 4a. Google Auth Token Validation

**Masalah:** `token` field di-destructure tanpa cek existence. Jika `undefined`, Google library throw cryptic error.

**Fix:**
```typescript
if (!token || typeof token !== "string") {
  return NextResponse.json({ error: "token required" }, { status: 400 });
}
```

### 4b. Topup Amount Validation

**Masalah:** Endpoint menerima `amountCents` tanpa type checking. Negative, zero, string, atau angka sangat besar lolos.

**Fix:**
```typescript
if (!userId || typeof userId !== "string") {
  return NextResponse.json({ error: "userId required" }, { status: 400 });
}
if (!amountCents || typeof amountCents !== "number" || amountCents <= 0 || !Number.isFinite(amountCents)) {
  return NextResponse.json({ error: "amountCents must be a positive number" }, { status: 400 });
}
if (amountCents > 100000) {
  return NextResponse.json({ error: "Maximum top-up is $1,000" }, { status: 400 });
}
```

### 4c. Mint userId Validation

**Masalah:** `POST /api/mint` destructure `userId` tanpa cek. Jika `undefined`, `parseObjectId(undefined)` crash.

**Fix:**
```typescript
if (!userId) {
  return NextResponse.json({ error: "userId required" }, { status: 400 });
}
```

---

## 5. Misc Bug Fixes

**Commit:** `c0c97b0`  
**Files:** `app/layout.tsx`, `app/profile/page.tsx`, `lib/qr.ts`, `api/admin/transactions/route.ts`

### 5a. HTML lang Attribute
```diff
- <html lang="id">
+ <html lang="en">
```
UI bahasa Inggris, sebelumnya `lang="id"` (Indonesia) — salah untuk accessibility dan SEO.

### 5b. Typo in data-testid
```diff
- data-testid={`profilee-card-${card.tokenId}`}
+ data-testid={`profile-card-${card.tokenId}`}
```
Double "e" mem-break E2E test selectors.

### 5c. QR Fallback URL
```diff
- const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://frontend-rosy-pi-88.vercel.app";
+ const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gachard.vercel.app";
```
Fallback sebelumnya menunjuk ke deployment lama yang mungkin sudah tidak aktif.

### 5d. Admin Transactions — Unused creditBalance
**File:** `api/admin/transactions/route.ts`

Dihapus: `creditBalance` lookup + dynamic `import("mongodb")` di dalam loop. Variable tidak pernah di-include di response, tapi menghasilkan 800-1000 DB queries per admin page load.

```diff
- const result = await Promise.all(
-   txs.map(async (tx) => {
-     let creditBalance = null;
-     if (tx.type === "mint" && tx.userId) {
-       const user = await usersCollection.findOne({ _id: new (await import("mongodb").then(m => m.ObjectId))(tx.userId) });
-       creditBalance = user?.creditBalance;
-     }
-     return { ... };
-   })
- );
+ const result = txs.map((tx) => ({ ... }));
```

---

## 6. Dead Code Removal

**Commit:** `c0c97b0`

| File | Alasan Hapus |
|------|-------------|
| `frontend/lib/api.ts` | `googleLogin()` tidak pernah di-import |
| `frontend/lib/vision.ts` | `analyzeCardImage()` tidak pernah di-import |
| `frontend/components/PackDemo.tsx` | Tidak pernah di-import di halaman manapun |

---

## 7. Vercel Build Configuration

**Commit:** `e172f1b`  
**File:** `vercel.json` (baru)

### Masalah
Project `gachard` di Vercel build dari root directory, tapi `app/` ada di dalam `frontend/`. GitHub-triggered deployments gagal:
```
Error: Couldn't find any `pages` or `app` directory.
```

### Fix
```json
{
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "cd frontend && npm install",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs"
}
```

### Dampak
- GitHub push ke `main` → auto-deploy berhasil
- GitHub push ke `Secondary` → auto-deploy berhasil

---

## 8. Guest Access — Packs Page

**Commit:** `bb361f8`  
**File:** `frontend/app/packs/page.tsx`

### Masalah
Guest yang mengunjungi `/packs` langsung di-redirect ke `/login`. Tidak bisa melihat pack cards atau drop rates.

### Perubahan

**Sebelum:**
```typescript
useEffect(() => {
  const stored = window.localStorage.getItem("user");
  if (!stored) {
    window.location.replace("/login");  // ← hard redirect
    return;
  }
  // ...
}, []);

if (!ready || !user) return null;  // ← blank page tanpa auth
```

**Sesudah:**
```typescript
useEffect(() => {
  const stored = window.localStorage.getItem("user");
  if (stored) {
    try { setUser(JSON.parse(stored)); }
    catch { window.localStorage.removeItem("user"); }
  }
  setReady(true);  // ← always ready
}, []);

if (!ready) return null;  // ← render tanpa auth
```

**Buy button:**
```diff
- router.push("/login");
+ router.push("/login?next=/packs");  // ← balik ke packs setelah login
```

### Dampak
| Sebelum | Sesudah |
|---------|---------|
| Guest → redirect `/login` | Guest bisa lihat Packs page |
| Pack cards tidak terlihat | Pack cards + drop rates terlihat |
| Balance selalu tampil | Balance hanya saat login |
| Buy tanpa login → `/login` | Buy tanpa login → `/login?next=/packs` |

---

## 9. Environment Variables — Vercel

**Commit:** (no commit — Vercel dashboard only)

Di-set via `vercel env add` untuk project `gachard` (production):

| Variable | Value | Purpose |
|----------|-------|---------|
| `ENABLE_DEMO_LOGIN` | `true` | Aktifkan tombol Demo Account |
| `MONGODB_URL` | `mongodb+srv://...` | MongoDB Atlas connection |
| `DATABASE_NAME` | `gachard` | Nama database |
| `BSC_TESTNET_RPC` | `https://bsc-testnet-rpc.publicnode.com` | BNB Testnet RPC |
| `CONTRACT_ADDRESS` | `0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a` | Smart contract |
| `ADMIN_WALLET_ADDRESS` | `0xF7DEd49EB412F69520c38C3f7e36523d71428DEa` | Admin wallet |
| `ADMIN_PRIVATE_KEY` | `0xf77d...` | Admin private key (testnet) |
| `ADMIN_USERNAME` | `gachard-admin-aaafac` | Basic Auth username |
| `ADMIN_PASSWORD` | `qPBfAqpqYgYheb5T6_w-h1sB` | Basic Auth password |
| `GOOGLE_CLIENT_ID` | `779312331118-...` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth |
| `GEMINI_API_KEY` | `AQ.Ab8RN...` | Gemini AI |
| `ENCRYPTION_SECRET_KEY` | `gachard-hackathon-2026-...` | AES-256-GCM encryption |
| `CHAIN_ID` | `97` | BNB Testnet chain ID |

---

## 10. Deployment History

| Time | URL | Status | Trigger |
|------|-----|--------|---------|
| 14:26 | `gachard.vercel.app` | ✅ Ready | CLI deploy (root) |
| 14:49 | `gachard-git-secondary-gachard.vercel.app` | ✅ Ready | GitHub push (Secondary) |
| 19:23 | `gachard.vercel.app` | ✅ Ready | GitHub push (main + vercel.json) |
| 19:36 | `gachard.vercel.app` | ✅ Ready | CLI deploy (env vars) |
| 19:51 | `gachard.vercel.app` | ✅ Ready | CLI deploy (packs fix) |

---

## File Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `frontend/proxy.ts` | Renamed → `middleware.ts` | +1 / -1 |
| `frontend/middleware.ts` | Created (from rename) | — |
| `frontend/app/login/page.tsx` | Modified | +7 / -2 |
| `frontend/app/packs/page.tsx` | Modified | +9 / -11 |
| `frontend/app/layout.tsx` | Modified | +1 / -1 |
| `frontend/app/profile/page.tsx` | Modified | +1 / -1 |
| `frontend/app/api/auth/google/route.ts` | Modified | +3 / -0 |
| `frontend/app/api/cards/route.ts` | Modified | +1 / -2 |
| `frontend/app/api/credits/topup/route.ts` | Modified | +8 / -2 |
| `frontend/app/api/mint/route.ts` | Modified | +4 / -2 |
| `frontend/app/api/print/route.ts` | Modified | +1 / -2 |
| `frontend/app/api/print/checkout/route.ts` | Modified | +1 / -2 |
| `frontend/app/api/redeem/route.ts` | Modified | +1 / -2 |
| `frontend/app/api/admin/transactions/route.ts` | Modified | -30 |
| `frontend/lib/mongodb.ts` | Modified | +9 / -0 |
| `frontend/lib/qr.ts` | Modified | +1 / -1 |
| `frontend/lib/api.ts` | Deleted | -13 |
| `frontend/lib/vision.ts` | Deleted | -100 |
| `frontend/components/PackDemo.tsx` | Deleted | -68 |
| `vercel.json` | Created | +6 |
| `docs/BUG_FIX_REPORT.md` | Created | +246 |

---

## Verification Checklist

- [x] `npm run build` passes
- [x] Middleware detected (`ƒ Proxy (Middleware)`)
- [x] No TypeScript errors
- [x] All API routes compile
- [x] Demo Account button visible (ENABLE_DEMO_LOGIN=true)
- [x] Guest can access `/packs` without login
- [x] Buy button redirects to `/login?next=/packs`
- [x] Admin routes protected with Basic Auth
- [x] Protected routes redirect to `/login`
- [x] Open redirect blocked
- [x] Invalid ObjectId returns 400

---

## Remaining Issues (Not Addressed)

| # | Severity | Issue |
|---|----------|-------|
| 1 | MEDIUM | Session in localStorage + non-HttpOnly cookie |
| 2 | MEDIUM | Topup endpoint has no real payment verification |
| 3 | MEDIUM | Print endpoint doesn't verify card ownership |
| 4 | MEDIUM | N+1 query in admin endpoints |
| 5 | MEDIUM | Hydration mismatch on home page |
| 6 | MEDIUM | `scan/route.ts` loads ALL users |
| 7 | LOW | `window.location.reload()` after print |
| 8 | LOW | Inline `<style>` in HomeHero |
| 9 | LOW | Subscribe form does nothing |
