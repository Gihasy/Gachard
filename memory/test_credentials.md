# Test Credentials

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
