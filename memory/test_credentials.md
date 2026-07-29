# Test Credentials

## Demo Account (real BNB Testnet account, Google login still available)
- On `/login`, when `ENABLE_DEMO_LOGIN=true`, the guest action becomes a **"Demo Account"** button (data-testid=`login-demo-btn`). Google OAuth stays as primary sign-in when `GOOGLE_CLIENT_ID` is set.
- `POST /api/auth/demo` creates a REAL custodial-wallet user (BNB Testnet), assigns a sequential handle **@DemoN** (via `counters` collection), grants 10,000 starter credits, and sets the session (localStorage `user` + `gachard_uid` cookie).
- Real on-chain minting works: "Buy & Open" on /packs calls `mintBatch` on the active contract via the admin wallet (verified mined on BNB Testnet, iteration_8).
- Wallet address & blockchain data are hidden from the user (not on /profile or /packs); visible ONLY in the Admin console (Users → walletAddress, Transactions → txHash to testnet.bscscan.com).
- Blockchain config in `frontend/.env` (gitignored): `BSC_TESTNET_RPC` (public), `CONTRACT_ADDRESS=0x0bb3dd543ff752bd15a50cbb3cba059bea6a278a` (active), `ADMIN_WALLET_ADDRESS=0xF7DEd49EB412F69520c38C3f7e36523d71428DEa`, `ADMIN_PRIVATE_KEY` (SECRET — testnet only, do NOT commit), `ENCRYPTION_SECRET_KEY`. For Vercel, set these same env vars in project settings.
- After a mint (status pending/Processing), `POST /api/admin/confirm-all` (admin) polls receipts and populates on-chain tokenIds.

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
