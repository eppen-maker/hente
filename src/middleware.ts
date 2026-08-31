import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/session";

/**
 * Guards the admin area.
 *
 * Runs before every /admin request, so a new page is protected the moment it
 * exists rather than when somebody remembers to add a check.
 */

const LOGIN_PATH = "/admin/logg-inn";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = process.env.ADMIN_PASSWORD ?? "";

  // No password configured: open in development, closed in production. The
  // CRM holds customer contacts and SØRKYST's own cost price.
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(null, { status: 404 });
  }

  if (pathname === LOGIN_PATH) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySessionToken(token, password)) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PATH;
  // Come back to the page that was asked for after signing in.
  login.search = pathname === "/admin" ? "" : `?neste=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
