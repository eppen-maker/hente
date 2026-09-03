import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface SessionUser {
  authUserId: string;
  email: string | null;
  profile: Profile;
}

/** Current signed-in user with their profile, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, auth_user_id, first_name, last_name, email, phone, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return { authUserId: user.id, email: user.email ?? null, profile: profile as Profile };
});

/** Where a user lands after signing in, based on their role. */
export function homePathForRole(role: Profile["role"]): string {
  switch (role) {
    case "SORKYST_ADMIN":
      return "/admin";
    case "CLUB_ADMIN":
    case "TEAM_ADMIN":
      return "/club";
    default:
      return "/seller";
  }
}
