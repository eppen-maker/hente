import { NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/lib/admin/session";

/** Clears the admin session. POST only, so a stray link cannot sign you out. */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/logg-inn", request.url), {
    status: 303,
  });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
