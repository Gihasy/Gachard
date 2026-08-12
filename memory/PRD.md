# Gachard — PRD / Working Notes

## Original Problem Statement (this session)
Buat tampilan https://www.gachard.com/profile menyesuaikan ukuran iPhone 12 Pro (390x844) dan Samsung Galaxy S8+ (360x740) — serta semua dimensi responsive standar di F12 — dengan commit terbaru di repo Gachard. Masalah utama: elemen terpotong. Login via demo account (tanpa Google).

## Stack
- Next.js 16 (App Router) frontend on port 3000; FastAPI reverse-proxy on 8001 (forwards /api/* → :3000).
- MongoDB (local). Supervisor runs `next start` (PRODUCTION build) → must `yarn build` after code changes, then `supervisorctl restart frontend`.
- Demo login: `/login` → "Demo Account" button (ENABLE_DEMO_LOGIN=true). Creates @DemoN user with 10k credits.

## Work done (June 2026 — responsive profile)
- Verified `/profile` layout across 320/360/375/390/414/540/768/820px: NO horizontal overflow at any width.
- Fixed real cutoff: collection card meta row used `justify-between` (no wrap) → long status badge "IN PROGRESS" was clipped by card's overflow-hidden at 360px 2-col grid. Changed to `flex flex-wrap justify-between gap-1` so badge wraps below the rarity tag instead of clipping.
- Fixed data mismatch on profile cards: `/api/cards` returns `displayStatus`, but page read non-existent `status`/`fulfillmentStatus`. Result was an empty status pill and wrong stats (all counted "Digital"). Updated Card type + stats + badge to use `displayStatus` ("Digital"/"In Progress"/"Real").
- File changed: `frontend/app/profile/page.tsx` only.

## Verification
- Screenshotted iPhone 12 Pro (390) & Galaxy S8+ (360) with empty and 15-card collections (incl. pagination page 2 with all rarities/statuses). All elements fit, badges readable, no cutoff. (Test cards seeded into Demo2 then removed — DB restored.)

## Backlog / Next
- P2: `/api/cards` no longer returns raw `status`; if any other page relies on `status`, align to `displayStatus`.
- P2: Consider truncating/abbreviating very long badge text on ultra-narrow screens instead of wrapping, if design prefers single-line.
- Deploy latest commit so production gachard.com/profile reflects the responsive fixes.

---
## Update — Aug 2026 (E1 session)
### Feature: QR code in Card Details modal
- `frontend/app/api/scan/route.ts` now returns `qrDataUrl` (QR encoding the card's verify URL).
- `frontend/components/CardDetailModal.tsx` renders the QR beneath the card artwork ("Scan to verify"); hidden for Print Requested / Real cards.

### Feature: Emergent-managed Google sign-in
- New route handlers: `POST /api/auth/session` (exchanges session_id at Emergent, upserts user by email, 7-day session in `user_sessions`, sets `session_token` httpOnly + `gachard_uid` cookies), `GET /api/auth/me`, `POST /api/auth/logout`.
- `frontend/lib/auth.ts`: added `getOrCreateUserByEmail`, `createSession`, `getUserBySessionToken`, `deleteSession`.
- `frontend/app/auth-callback/page.tsx`: processes `#session_id` fragment → `/collection`.
- `frontend/app/login/page.tsx`: "Continue with Google" (Emergent) button; redirect built from `window.location.origin + '/auth-callback'` (never hardcoded).
- `frontend/components/Navbar.tsx`: Logout button (desktop + mobile).
- Cookies set via explicit `Set-Cookie` headers (Next.js coalesces `.cookies.set` when mixing SameSite None+Lax).
- Tested: iteration_13 (6/7 backend, 7/7 frontend) + logout Set-Cookie fix verified. Real Google OAuth login is not automatable; validated via seeded Mongo sessions.
- Testing playbook: `/app/auth_testing.md`.

### Env note (preview only, gitignored)
- `frontend/.env` created for local run: MONGODB_URL, DATABASE_NAME, NEXT_PUBLIC_APP_URL, ADMIN_USERNAME/PASSWORD, ENABLE_DEMO_LOGIN, ENCRYPTION_SECRET_KEY, BSC_TESTNET_RPC. No real contract/admin key — on-chain flows remain unconfigured in this preview.

---
## Update — Deployment fix (Aug 2026)
- **Root cause of failed production deploy**: build context required `/app/backend/.env`, which did not exist ("read env file backend/.env: no such file or directory").
- **Fixes (code/config only)**: created `backend/.env` (MONGO_URL, DB_NAME); `frontend/lib/mongodb.ts` now reads `MONGODB_URL||MONGO_URL` and `DATABASE_NAME||DB_NAME||'gachard'` (so prod Atlas injected as MONGO_URL/DB_NAME works); `EMERGENT_SESSION_URL` env-overridable; added projections+limits to `/api/admin/users`, `/api/admin/cards`, `/api/cards`; added `memory/test_credentials.md` + `auth_testing.md` to `.gitignore`.
- **Verified**: deployment_agent — env-file blocker cleared (env_files_ok=true, compilation_passed=true, unoptimized_queries_detected=false). Regression suite iteration_15: backend 18/18, frontend 4/4.
- **Note**: deployment_agent still flags `ethers` as "not deployable" — a generic heuristic, NOT the cause of the K8s failure (which was purely the missing env file). ethers only calls a public BNB Testnet RPC.
- **Prod runtime reminder**: for full on-chain features (buy-pack reveal via mintBatch, print, redeem) set these secrets in the production env: CONTRACT_ADDRESS, ADMIN_WALLET_ADDRESS, ADMIN_PRIVATE_KEY, BSC_TESTNET_RPC, ENCRYPTION_SECRET_KEY, plus ADMIN_USERNAME/PASSWORD, ENABLE_DEMO_LOGIN, NEXT_PUBLIC_APP_URL. MongoDB Atlas is auto-injected as MONGO_URL/DB_NAME.

---
## Update — Deployment fix #2 (frontend-build-push)
- **Root cause:** `/app/frontend` had BOTH `package-lock.json` and `yarn.lock`. `package-lock.json` was out of sync with `package.json` (`Missing: @emnapi/runtime@1.11.3, @emnapi/core@1.11.3`). The Emergent cloud builder ran `npm ci`, which requires a perfectly synced lockfile → exit 1 → `frontend-build-push` failed. Local builds worked because we use yarn.
- **Fix:** deleted the stale `frontend/package-lock.json` so the builder uses the valid `yarn.lock` (verified `yarn install --frozen-lockfile` passes; `npm ci` was the failing path). Build-config-only change; no source/runtime code touched.
- **Verified:** clean `yarn build` passes; regression iteration_16 — backend 18/18, frontend 4/4, no regressions.

---
## Update — Deployment fix #3 (runtime 502: spawnerr node_modules/.bin/next)
- **Diagnosis:**
  1. Preview `[program:frontend]` = `yarn start`, `directory=/app/frontend` (works). Production uses a platform-generated `nextjs` supervisor program that spawns the relative command `node_modules/.bin/next` — so node_modules MUST exist in its working dir at runtime.
  2. `node_modules/.bin/next` symlink is created correctly by install (verified: -> ../next/dist/bin/next, executable, Next 16.2.11). So install is fine WHEN it runs.
  3. Platform uses npm. Deploy fix #2 DELETED package-lock.json. The platform's runtime install runs `npm ci`, which REQUIRES a package-lock.json — with none present, runtime install produced no node_modules → `node_modules/.bin/next` missing → spawnerr → 502 (even though the build stage still had a .next → "[OK] Next.js build found").
  4. Confirmed via from-scratch: fresh `npm install` then `npm ci` both EXIT=0 and produce an executable `.bin/next`; `npm run build` passes. The earlier `npm ci` failure was a STALE lockfile, not npm itself.
- **Fix:** regenerated a fresh, in-sync `frontend/package-lock.json` (so `npm ci` works at BOTH build and runtime) and REMOVED `yarn.lock` (npm-only, eliminates dual-lockfile ambiguity that caused fix #2's build failure). Full npm reinstall of node_modules.
- **Verified:** `npm ci` EXIT=0, `.bin/next` present+executable, `npm run build` passes, preview health/login 200, regression iteration_17 backend 18/18 + frontend 4/4.
