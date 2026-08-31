import "server-only";

import { notFound } from "next/navigation";

/**
 * Admin access gate.
 *
 * Authentication is not built yet — this is the single seam it will drop into.
 * Every admin page and server action calls `requireAdmin()`, so switching to
 * Supabase Auth (or any other provider) means changing this file and nothing
 * else.
 *
 * Until then `/admin` is OPEN. Do not deploy the admin area publicly.
 */

export interface AdminSession {
  actor: string;
  authenticated: boolean;
}

export const ADMIN_AUTH_ENABLED = false;

export async function requireAdmin(): Promise<AdminSession> {
  if (!ADMIN_AUTH_ENABLED) {
    // Open in local development, closed everywhere else. The CRM holds
    // customer contact details and SØRKYST's own cost price; it must not be
    // reachable on a public URL before authentication exists.
    if (process.env.NODE_ENV === "production") notFound();
    return { actor: "lokal admin", authenticated: false };
  }

  // Future: read the session, verify the role, redirect to /logg-inn when
  // missing. Throwing here keeps the unbuilt path from silently allowing
  // access if the flag is flipped before the implementation lands.
  throw new Error("Admin-autentisering er ikke implementert ennå.");
}
