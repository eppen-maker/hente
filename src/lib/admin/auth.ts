import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ADMIN_COOKIE, verifySessionToken } from "./session";

/**
 * Admin access gate.
 *
 * Every admin page and server action calls `requireAdmin()`. The route guard
 * in `src/middleware.ts` catches unauthenticated requests first; this is the
 * second lock, so a server action can never run unauthenticated even if a
 * request somehow bypasses the middleware.
 *
 * Set ADMIN_PASSWORD to turn authentication on. Without it the admin is open
 * in local development and returns 404 in production.
 */

export interface AdminSession {
  actor: string;
  authenticated: boolean;
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function isAdminAuthEnabled(): boolean {
  return adminPassword().length > 0;
}

export async function requireAdmin(): Promise<AdminSession> {
  const password = adminPassword();

  if (!password) {
    if (process.env.NODE_ENV === "production") notFound();
    return { actor: "lokal admin", authenticated: false };
  }

  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;

  if (!(await verifySessionToken(token, password))) {
    redirect("/admin/logg-inn" as never);
  }

  return { actor: "SØRKYST", authenticated: true };
}
