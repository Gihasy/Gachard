import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth guard for protected routes.
 *
 * The client stores the session as a `user` entry in localStorage AND mirrors
 * a lightweight cookie `gachard_uid` on login so this middleware can enforce
 * the same rule at the edge. If the cookie is missing on a protected page,
 * redirect to /login.
 *
 * This runs before the page bundle loads, so it's much more reliable than a
 * useEffect-based redirect in dev.
 *
 * Also enforces HTTP Basic Auth on /admin routes.
 */
const PROTECTED = ["/collection", "/profile", "/topup"];

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

  // Protected user routes: cookie-based auth
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
  matcher: ["/collection/:path*", "/profile/:path*", "/topup/:path*", "/admin/:path*", "/api/admin/:path*"],
};
