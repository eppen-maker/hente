import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser, homePathForRole } from "@/lib/auth/session";

/** Exchanges a magic-link / OAuth code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (next) return NextResponse.redirect(`${origin}${next}`);
  const user = await getSessionUser();
  return NextResponse.redirect(`${origin}${user ? homePathForRole(user.profile.role) : "/login"}`);
}
