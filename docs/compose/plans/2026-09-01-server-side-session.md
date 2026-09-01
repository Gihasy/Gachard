# Server-Side Session — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Mass IDOR on all 19 user-facing API endpoints by implementing HMAC-signed server-side session cookies.

**Architecture:** Login endpoints issue an HMAC-SHA256 signed cookie (`gachard_session`) containing `userId|timestamp`. A shared `getAuthenticatedUser(req)` helper in `lib/session.ts` verifies the signature and returns the MongoDB user document. Middleware validates the cookie on all `/api/*` routes (except `/api/auth/*` and `/api/admin/*`). Each API route replaces its trust of client-supplied `userId` with the authenticated user from the session.

**Tech Stack:** Node.js `crypto` (HMAC-SHA256, built-in), Next.js middleware, existing `ENCRYPTION_SECRET_KEY` env var, MongoDB `users` collection.

## Global Constraints

- Session signing key = `ENCRYPTION_SECRET_KEY` (already in `.env.local`, min 32 chars)
- Cookie name: `gachard_session`
- Cookie: `httpOnly`, `Secure` (production), `SameSite=Lax`, `path=/`, `max-age=2592000` (30 days)
- Token format: `userId.unixTimestamp.HMAC-SHA256(userId.timestamp, key)`
- Backward compatibility: `localStorage("user")` + `gachard_uid` cookie remain for frontend page reads
- Public routes (scan, QR, wishlist-stats) remain accessible without auth
- Admin routes keep existing HTTP Basic Auth — no change

---

### Task 1: Create `lib/session.ts` — Session Token Helpers

**Covers:** S1, S2

**Files:**
- Create: `frontend/lib/session.ts`

**Interfaces:**
- Produces: `createSessionToken(userId: string): string`, `verifySessionToken(token: string): { userId: string } | null`, `getAuthenticatedUser(req: Request): Promise<Document | null>`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`

- [ ] **Step 1: Create `frontend/lib/session.ts`**

```typescript
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getCollection, parseObjectId } from "./mongodb";

export const SESSION_COOKIE_NAME = "gachard_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSigningKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_SECRET_KEY must be at least 32 characters");
  }
  return Buffer.from(secret, "utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningKey()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${userId}.${timestamp}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, timestampStr, signature] = parts;
  const payload = `${userId}.${timestampStr}`;

  // Verify HMAC signature
  const expectedSig = sign(payload);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  // Check expiration (30 days)
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;
  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (ageSeconds > SESSION_MAX_AGE || ageSeconds < 0) return null;

  // Validate userId is a valid ObjectId string
  try {
    parseObjectId(userId);
  } catch {
    return null;
  }

  return { userId };
}

export async function getAuthenticatedUser(req: Request) {
  // Read cookie from request headers (works in both middleware and route handlers)
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  const session = verifySessionToken(token);
  if (!session) return null;

  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne(
    { _id: parseObjectId(session.userId) } as Record<string, unknown>
  );
  return user;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd D:\Gachard\frontend && npx tsc --noEmit lib/session.ts`
Expected: No errors (or only missing module errors for `@/lib/mongodb` which are path-alias related — acceptable)

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/session.ts
git commit -m "feat(auth): add server-side session token helpers"
```

---

### Task 2: Update Auth Routes to Set Session Cookie

**Covers:** S4

**Files:**
- Modify: `frontend/app/api/auth/google/route.ts`
- Modify: `frontend/app/api/auth/demo/route.ts`

**Interfaces:**
- Consumes: `createSessionToken(userId)`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE` from `lib/session.ts`
- Produces: `Set-Cookie` header in login responses

- [ ] **Step 1: Update Google auth route**

In `frontend/app/api/auth/google/route.ts`, add session cookie to response:

```typescript
import { NextResponse } from "next/server";
import { verifyGoogleToken, getOrCreateUser } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const googleUser = await verifyGoogleToken(token);
    const user = await getOrCreateUser(googleUser);
    const userId = user._id.toString();

    const sessionToken = createSessionToken(userId);
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      user_id: userId,
      username: user.username,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
```

- [ ] **Step 2: Update Demo auth route**

In `frontend/app/api/auth/demo/route.ts`, add session cookie to response:

```typescript
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCollection } from "@/lib/mongodb";
import { getOrCreateUser } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

// ... keep existing nextDemoNumber() function unchanged ...

export async function POST() {
  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "Demo accounts are disabled" }, { status: 403 });
  }

  try {
    const n = await nextDemoNumber();
    const suffix = randomBytes(4).toString("hex");

    const user = await getOrCreateUser({
      sub: `demo-${suffix}`,
      email: `demo${n}@gachard.io`,
      name: `Demo ${n}`,
    });
    const userId = user._id.toString();

    const username = `Demo${n}`;
    const usersCollection = await getCollection("users");
    await usersCollection.updateOne(
      { _id: user._id } as Record<string, unknown>,
      { $set: { username } }
    );

    const sessionToken = createSessionToken(userId);
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      user_id: userId,
      username,
      email: user.email,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Demo account error:", error);
    return NextResponse.json({ error: "Could not generate demo account" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/auth/google/route.ts frontend/app/api/auth/demo/route.ts
git commit -m "feat(auth): set HMAC session cookie on login"
```

---

### Task 3: Update Middleware to Protect API Routes

**Covers:** S3

**Files:**
- Modify: `frontend/middleware.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `SESSION_COOKIE_NAME` from `lib/session.ts`
- Produces: 401 response for unauthenticated API requests

- [ ] **Step 1: Update middleware**

Replace `frontend/middleware.ts` with:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

const PROTECTED = ["/collection", "/profile", "/topup"];

// Public API routes that don't require authentication
const PUBLIC_API = [
  "/api/auth/",       // login endpoints
  "/api/scan",        // QR scan — public by design
  "/api/cards/",      // QR generation (/api/cards/[tokenId]/qr)
  "/api/marketplace/wishlist-stats", // anonymous wishlist interaction
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API.some((p) => pathname.startsWith(p));
}

// Constant-time string comparison (safe for Edge Runtime)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin routes: HTTP Basic Auth (covers /admin pages AND /api/admin endpoints)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Gachard Admin"' },
      });
    }

    const encoded = authHeader.slice(6);
    const decoded = atob(encoded);
    const [username, password] = decoded.split(":");

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;

    if (!expectedUser || !expectedPass || !safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
      return new NextResponse("Invalid credentials", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Gachard Admin"' },
      });
    }

    return NextResponse.next();
  }

  // API routes: session-based auth (except public APIs and auth endpoints)
  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const session = verifySessionToken(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // Session valid — let the request through
    // Route handlers will use getAuthenticatedUser() for the full user document
    return NextResponse.next();
  }

  // Protected user pages: cookie-based auth (existing behavior)
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  const uid = req.cookies.get("gachard_uid")?.value;
  if (uid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/collection/:path*",
    "/profile/:path*",
    "/topup/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/:path*",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/middleware.ts
git commit -m "feat(auth): protect API routes with session middleware"
```

---

### Task 4: Migrate CRITICAL Endpoints (5 routes)

**Covers:** S5

**Files:**
- Modify: `frontend/app/api/credits/topup/route.ts`
- Modify: `frontend/app/api/mint/route.ts`
- Modify: `frontend/app/api/dismantle/route.ts`
- Modify: `frontend/app/api/marketplace/listings/route.ts`
- Modify: `frontend/app/api/marketplace/listings/[id]/buy/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedUser(req)` from `lib/session.ts`
- Pattern: Replace `const { userId } = await request.json()` + manual user lookup with `const user = await getAuthenticatedUser(request)`

- [ ] **Step 1: Migrate `POST /api/credits/topup`**

In `frontend/app/api/credits/topup/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace the userId extraction + user lookup block with:
```typescript
const user = await getAuthenticatedUser(request);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = user._id.toString();
```
- Remove any `userId` from `await request.json()` destructuring (keep other fields like `amountCents`)

- [ ] **Step 2: Migrate `POST /api/mint`**

Same pattern in `frontend/app/api/mint/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace userId extraction + user lookup with `getAuthenticatedUser()`
- Keep `packType` from request body

- [ ] **Step 3: Migrate `POST /api/dismantle`**

Same pattern in `frontend/app/api/dismantle/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace userId extraction + user lookup with `getAuthenticatedUser()`
- Keep `cardId`/`tokenId` from request body
- Remove the manual `usersCollection.findOne({ _id: parseObjectId(userId) })` call

- [ ] **Step 4: Migrate `POST /api/marketplace/listings`**

Same pattern in `frontend/app/api/marketplace/listings/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace userId extraction + user lookup with `getAuthenticatedUser()`
- Keep `cardId`, `price` from request body

- [ ] **Step 5: Migrate `POST /api/marketplace/listings/[id]/buy`**

Same pattern in `frontend/app/api/marketplace/listings/[id]/buy/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace userId extraction + user lookup with `getAuthenticatedUser()`

- [ ] **Step 6: Commit**

```bash
git add frontend/app/api/credits/topup/route.ts frontend/app/api/mint/route.ts frontend/app/api/dismantle/route.ts frontend/app/api/marketplace/listings/route.ts "frontend/app/api/marketplace/listings/[id]/buy/route.ts"
git commit -m "fix(security): migrate 5 CRITICAL endpoints to server-side session"
```

---

### Task 5: Migrate HIGH Endpoints (8 routes)

**Covers:** S5

**Files:**
- Modify: `frontend/app/api/cards/route.ts`
- Modify: `frontend/app/api/transactions/route.ts`
- Modify: `frontend/app/api/print/route.ts`
- Modify: `frontend/app/api/print/checkout/route.ts`
- Modify: `frontend/app/api/redeem/route.ts`
- Modify: `frontend/app/api/claim-shipping/route.ts`
- Modify: `frontend/app/api/marketplace/listings/[id]/cancel/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedUser(req)` from `lib/session.ts`

- [ ] **Step 1: Migrate `GET /api/cards`**

In `frontend/app/api/cards/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace `const userId = searchParams.get("userId")` with:
```typescript
const user = await getAuthenticatedUser(request);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = user._id.toString();
```

- [ ] **Step 2: Migrate `GET /api/transactions`**

Same pattern in `frontend/app/api/transactions/route.ts`:
- Replace `userId` from query params with `getAuthenticatedUser()`
- Keep `txId` query param handling (single transaction lookup — but verify the transaction belongs to the authenticated user)

- [ ] **Step 3: Migrate `POST /api/print`**

Same pattern in `frontend/app/api/print/route.ts`:
- Replace userId from body with `getAuthenticatedUser()`
- Keep `tokenId` from body

- [ ] **Step 4: Migrate `POST /api/print/checkout`**

Same pattern in `frontend/app/api/print/checkout/route.ts`:
- Replace userId from body with `getAuthenticatedUser()`
- Keep `tokenId`, `shippingAddress` from body

- [ ] **Step 5: Migrate `POST /api/redeem`**

Same pattern in `frontend/app/api/redeem/route.ts`:
- Replace userId from body with `getAuthenticatedUser()`
- Keep `cardId`/`tokenId`, `code` from body

- [ ] **Step 6: Migrate `POST /api/claim-shipping`**

Same pattern in `frontend/app/api/claim-shipping/route.ts`:
- Replace userId from body with `getAuthenticatedUser()`
- Keep `claimId` from body

- [ ] **Step 7: Migrate `POST /api/marketplace/listings/[id]/cancel`**

Same pattern in `frontend/app/api/marketplace/listings/[id]/cancel/route.ts`:
- Replace userId from body with `getAuthenticatedUser()`

- [ ] **Step 8: Commit**

```bash
git add frontend/app/api/cards/route.ts frontend/app/api/transactions/route.ts frontend/app/api/print/route.ts frontend/app/api/print/checkout/route.ts frontend/app/api/redeem/route.ts frontend/app/api/claim-shipping/route.ts "frontend/app/api/marketplace/listings/[id]/cancel/route.ts"
git commit -m "fix(security): migrate 7 HIGH endpoints to server-side session"
```

---

### Task 6: Migrate MEDIUM Endpoints (4 routes)

**Covers:** S5

**Files:**
- Modify: `frontend/app/api/credits/route.ts`
- Modify: `frontend/app/api/crystal/route.ts`
- Modify: `frontend/app/api/cards/view/route.ts`

**Note:** `GET /api/scan` is public by design (QR scan) — no migration needed.

**Interfaces:**
- Consumes: `getAuthenticatedUser(req)` from `lib/session.ts`

- [ ] **Step 1: Migrate `GET /api/credits`**

In `frontend/app/api/credits/route.ts`:
- Add import: `import { getAuthenticatedUser } from "@/lib/session";`
- Replace `const userId = searchParams.get("userId")` with `getAuthenticatedUser()`

- [ ] **Step 2: Migrate `GET /api/crystal`**

Same pattern in `frontend/app/api/crystal/route.ts`:
- Replace `userId` from query params with `getAuthenticatedUser()`

- [ ] **Step 3: Migrate `POST /api/cards/view`**

Same pattern in `frontend/app/api/cards/view/route.ts`:
- Replace `userId` from body with `getAuthenticatedUser()`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/credits/route.ts frontend/app/api/crystal/route.ts frontend/app/api/cards/view/route.ts
git commit -m "fix(security): migrate 3 MEDIUM endpoints to server-side session"
```

---

### Task 7: Update Frontend to Send Cookies + Remove userId from Requests

**Covers:** S5

**Files:**
- Modify: Multiple frontend components that call API routes with `userId` in body/query

**Interfaces:**
- All `fetch("/api/...")` calls must include `credentials: "same-origin"` (default for same-origin, but explicit is better)
- Remove `userId` from request body/query in all frontend API calls

- [ ] **Step 1: Find all frontend files that send `userId` to API routes**

Run: `grep -r "userId" frontend/app/ frontend/components/ --include="*.tsx" --include="*.ts" -l`
Expected: List of files that reference `userId` in fetch calls

- [ ] **Step 2: Update each file**

For each file that sends `userId` in a fetch body or query param:
- Remove `userId` from the request body/query
- Add `credentials: "include"` to fetch options (ensures cookies are sent)
- Keep all other parameters (cardId, tokenId, packType, etc.)

Example pattern — before:
```typescript
const res = await fetch("/api/dismantle", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: user.user_id, cardId, tokenId }),
});
```

After:
```typescript
const res = await fetch("/api/dismantle", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ cardId, tokenId }),
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "fix(security): remove userId from frontend API calls, use session cookies"
```

---

### Task 8: End-to-End Verification

**Covers:** S1-S6

**Files:**
- None (testing only)

- [ ] **Step 1: Build check**

Run: `cd D:\Gachard\frontend && npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 2: Manual test — login sets session cookie**

1. Go to `https://gachard.vercel.app/login`
2. Login with Demo account
3. Open DevTools → Application → Cookies
4. Verify `gachard_session` cookie exists with `httpOnly` flag

- [ ] **Step 3: Manual test — API rejects unauthenticated requests**

```bash
curl -s -o /dev/null -w "%{http_code}" https://gachard.vercel.app/api/cards
```
Expected: `401`

- [ ] **Step 4: Manual test — API works with valid session**

1. Login in browser
2. Open DevTools → Network tab
3. Navigate to Collection page
4. Verify `/api/cards` returns 200 with user's cards

- [ ] **Step 5: Manual test — cannot access other user's data**

1. Login as Demo user A
2. Copy Demo user B's userId from a marketplace listing
3. Try to call `/api/credits?userId=<userB_id>` via curl (without session cookie)
4. Expected: 401

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "fix(security): server-side session — closes Mass IDOR on all 19 endpoints"
```
