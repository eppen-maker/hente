import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isSupabaseServerConfigured,
} from "./env";

let serverClient: SupabaseClient | null = null;

/**
 * Server client. Uses the service role key when present so route handlers can
 * write leads without exposing a key to the browser.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured()) return null;
  serverClient ??= createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serverClient;
}
