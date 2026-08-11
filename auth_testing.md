# Auth-Gated App Testing Playbook (Emergent Google Auth)

This app is Next.js (App Router). Backend = Next.js route handlers under `frontend/app/api`.
Sessions: httpOnly cookie `session_token` (7 days) stored in Mongo `user_sessions`, plus a
non-httpOnly `gachard_uid` cookie (user id) that the middleware uses to gate `/collection`,
`/profile`, `/topup`.

## Step 1: Create Test User & Session (MongoDB local)
```bash
mongosh "mongodb://localhost:27017/gachard" --eval '
var oid = new ObjectId();
var sessionToken = "test_session_" + Date.now();
db.users.insertOne({
  _id: oid,
  email: "test.user." + Date.now() + "@example.com",
  username: "TestUser",
  name: "Test User",
  picture: "https://via.placeholder.com/150",
  walletAddress: "0x0000000000000000000000000000000000000001",
  createdAt: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: oid.toString(),
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print("Session token: " + sessionToken);
print("User ID: " + oid.toString());
'
```

## Step 2: Test Backend API
```bash
# /api/auth/me via Bearer
curl -s "$APP_URL/api/auth/me" -H "Authorization: Bearer <SESSION_TOKEN>"

# /api/auth/me via cookie
curl -s "$APP_URL/api/auth/me" --cookie "session_token=<SESSION_TOKEN>"
```
Expect: `{ "user_id": "...", "username": "...", "email": "..." }`

## Step 3: Browser Testing (Playwright)
```python
await page.context.add_cookies([
  {"name": "session_token", "value": "<SESSION_TOKEN>", "domain": "<host>", "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"},
  {"name": "gachard_uid", "value": "<USER_ID>", "domain": "<host>", "path": "/", "sameSite": "Lax"},
])
await page.goto("<APP_URL>/collection")
```
Also set localStorage before app JS reads it:
```python
await page.add_init_script("localStorage.setItem('user', JSON.stringify({user_id:'<USER_ID>', username:'TestUser'}))")
```

## Real OAuth flow (manual)
1. Login page → "Continue with Google" → redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth-callback`
2. After Google, lands at `<origin>/auth-callback#session_id=...`
3. `/auth-callback` posts `session_id` to `/api/auth/session`, which calls Emergent
   `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` (X-Session-ID header),
   upserts user by email, stores session, sets cookies, then forwards to `/collection`.

## Quick Debug
```bash
mongosh "mongodb://localhost:27017/gachard" --eval 'db.users.find().limit(2).pretty(); db.user_sessions.find().limit(2).pretty();'
```

## Checklist
- [ ] `/api/auth/session` upserts user by email (no duplicate on re-login)
- [ ] `session_token` httpOnly cookie set (secure, sameSite=None)
- [ ] `gachard_uid` cookie set so middleware allows /collection
- [ ] `/api/auth/me` returns user for valid token, 401 otherwise
- [ ] `/api/auth/logout` deletes session + clears cookies
- [ ] Callback reads `window.location.hash` (fragment), uses useRef guard (StrictMode-safe)
