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
