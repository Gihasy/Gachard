# Test Credentials

## Demo / test-mode login (bypasses Google OAuth, Google login still available)
- On `/login`, the "Explore as guest" action is replaced by a **"Generate Demo Account"** button (data-testid=`login-demo-btn`) whenever `ENABLE_DEMO_LOGIN=true`. Google OAuth is NOT removed — it stays as the primary sign-in when `GOOGLE_CLIENT_ID` is set.
- Backend: `POST /api/auth/demo` (gated by `ENABLE_DEMO_LOGIN=true`). Each click creates a UNIQUE sandbox user (`demo-<hex>@gachard.io`) with a custodial wallet + 10,000 starter credits, and sets the standard session (localStorage `user` + `gachard_uid` cookie). Unlocks /profile, /collection, /topup, /packs.
- Requires `ENCRYPTION_SECRET_KEY` (≥32 chars) in env for user creation. Disable in prod by unsetting `ENABLE_DEMO_LOGIN`.
- On-chain functions (real pack mint on /packs, redeem, print) need blockchain env (`BSC_TESTNET_RPC`, `CONTRACT_ADDRESS`, `ADMIN_PRIVATE_KEY`, `ADMIN_WALLET_ADDRESS`). Absent here, so "Buy & Open" deducts then auto-refunds credits and shows an error. The client-side pack-opening DEMO on /play-trade works fully without any blockchain.

## Preview ingress reverse proxy (backend/server.py)
- This is a Next.js-only app; APIs live on port 3000. The platform ingress forwards `/api/*` to port 8001. `backend/server.py` is a FastAPI reverse proxy on 8001 that forwards ALL requests to `http://localhost:3000`, so `/api/*` (incl. `/api/auth/demo`, `/api/admin/*`) works from the public preview URL. NOTE: on Vercel this is not needed — Next.js serves API routes natively.

## Mock user (used by all frontend automated tests)

- **localStorage.user** (set on the client):
  ```json
  {"user_id": "demo123", "username": "CosmicPlayer", "email": "demo@gachard.io"}
  ```
- **Cookie** (required for the `proxy.ts` edge auth guard):
  - Name: `gachard_uid`
  - Value: `demo123`
  - Domain: `localhost` (dev) / preview host (prod)
  - Path: `/`
  - SameSite: `Lax`
  - Max-Age: `2592000` (30 days)

Both must be set together — the cookie unlocks `/koleksi`, `/profil`, `/topup` at the network edge, and localStorage unlocks the client-side render.

## How they get created

In production, `handleGoogleLogin` in `/app/frontend/app/login/page.tsx` writes both after a successful `googleLogin(token)` call:
```ts
localStorage.setItem("user", JSON.stringify(result));
document.cookie = `gachard_uid=${result.user_id}; path=/; max-age=2592000; SameSite=Lax`;
```

Logout (`/profil` "Log out" button) clears both.

## Google OAuth (real)
The `googleLogin` implementation in `lib/api.ts` is currently a mock that returns a canned user. Real Google OAuth is on the P1 backlog and will be integrated via the `integration_playbook_expert_v2` when the user requests it.

## Admin console (HTTP Basic Auth)
- `/admin` and `/api/admin/*` are protected by HTTP Basic Auth in `proxy.ts`.
- Credentials come from `frontend/.env`: `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=gachard123`.
- Works on localhost:3000. NOTE: through the preview/prod Kubernetes ingress the `Authorization: Basic` header is stripped, so `/api/admin/*` returns 502 there. In a real browser the Basic-auth dialog still lets you view the `/admin` page shell. Consider migrating admin auth to a token/session cookie for proxy robustness.

## Local dev env (`frontend/.env`)
- `MONGODB_URL=mongodb://localhost:27017`, `DATABASE_NAME=gachard`, `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=gachard123`.
- Supervisor `frontend` runs `yarn start` (production build). Run `yarn build` after code changes before restarting `frontend`, or use `yarn dev` manually for hot reload.
