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
 */
const PROTECTED = ["/collection", "/profile", "/topup"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/collection/:path*", "/profile/:path*", "/topup/:path*"],
};
