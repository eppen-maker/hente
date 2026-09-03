import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client — bypasses RLS.
 *
 * Only used in trusted server paths that have already run an authorization
 * guard, or that are inherently public and read a narrow, non-personal
 * projection (the public sales page, checkout, payment webhooks, campaign
 * closing, CSV export, seeding).
 */
export function createAdminSupabase() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
