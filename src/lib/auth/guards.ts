import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser, type SessionUser } from "./session";
import type { UserRole } from "@/lib/types";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Require a signed-in user; redirect to login otherwise. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  return user;
}

/** Require a signed-in user holding one of the given roles. */
export async function requireRole(roles: UserRole[], returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.profile.role)) redirect("/forbidden");
  return user;
}

/**
 * Club access: SØRKYST admins always, club admins for their own clubs,
 * team admins for clubs where they administer at least one team.
 */
export async function hasClubAccess(user: SessionUser, clubId: string): Promise<boolean> {
  if (user.profile.role === "SORKYST_ADMIN") return true;
  const supabase = await createServerSupabase();

  if (user.profile.role === "CLUB_ADMIN") {
    const { data } = await supabase
      .from("club_admins")
      .select("club_id")
      .eq("profile_id", user.profile.id)
      .eq("club_id", clubId)
      .maybeSingle();
    return Boolean(data);
  }

  if (user.profile.role === "TEAM_ADMIN") {
    const { data } = await supabase
      .from("team_admins")
      .select("team_id, teams!inner(club_id)")
      .eq("profile_id", user.profile.id)
      .eq("teams.club_id", clubId)
      .limit(1);
    return Boolean(data?.length);
  }

  return false;
}

export async function requireClubAccess(clubId: string): Promise<SessionUser> {
  const user = await requireRole(["SORKYST_ADMIN", "CLUB_ADMIN", "TEAM_ADMIN"], "/club");
  if (!(await hasClubAccess(user, clubId))) redirect("/forbidden");
  return user;
}

/** Campaign access is derived from the campaign's club, plus team-admin scoping. */
export async function requireCampaignAccess(campaignId: string): Promise<{ user: SessionUser; clubId: string }> {
  const user = await requireRole(["SORKYST_ADMIN", "CLUB_ADMIN", "TEAM_ADMIN"], "/club");
  const supabase = await createServerSupabase();
  const { data: campaign } = await supabase.from("campaigns").select("id, club_id").eq("id", campaignId).maybeSingle();
  if (!campaign) redirect("/forbidden");
  if (!(await hasClubAccess(user, campaign.club_id))) redirect("/forbidden");
  return { user, clubId: campaign.club_id };
}

/** Team ids a team admin is limited to; null means "no team restriction". */
export async function allowedTeamIds(user: SessionUser): Promise<string[] | null> {
  if (user.profile.role !== "TEAM_ADMIN") return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("team_admins").select("team_id").eq("profile_id", user.profile.id);
  return (data ?? []).map((r) => r.team_id as string);
}
