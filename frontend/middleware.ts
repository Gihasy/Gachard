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
