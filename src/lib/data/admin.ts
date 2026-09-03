import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { aggregateOrders, type FinancialBreakdown } from "@/lib/finance";
import type { Campaign, Club } from "@/lib/types";

export interface AdminMetrics {
  activeClubs: number;
  activeCampaigns: number;
  activeSellers: number;
  totals: FinancialBreakdown;
  productsAwaitingPickup: number;
  clubLeaderboard: { clubId: string; clubName: string; quantity: number; clubEarning: number }[];
}

/**
 * SØRKYST-wide metrics. Reads run as the signed-in admin, so RLS still applies —
 * a non-admin session simply sees nothing here.
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = await createServerSupabase();

  const [{ data: clubs }, { data: campaigns }, { count: sellerCount }, { data: orders }, { data: pickups }] =
    await Promise.all([
      supabase.from("clubs").select("id, name, active"),
      supabase.from("campaigns").select("id, status"),
      supabase.from("sellers").select("id", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("orders")
        .select(
          "club_id, quantity, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat",
        )
        .eq("status", "PAID"),
      supabase.from("seller_pickups").select("expected_quantity, status").neq("status", "PICKED_UP"),
    ]);

  const clubNames = new Map((clubs ?? []).map((c) => [c.id as string, c.name as string]));
  const byClub = new Map<string, { quantity: number; clubEarning: number }>();
  for (const order of orders ?? []) {
    const current = byClub.get(order.club_id) ?? { quantity: 0, clubEarning: 0 };
    current.quantity += order.quantity;
    current.clubEarning += order.club_earning_amount;
    byClub.set(order.club_id, current);
  }

  return {
    activeClubs: (clubs ?? []).filter((c) => c.active).length,
    activeCampaigns: (campaigns ?? []).filter((c) => c.status === "ACTIVE").length,
    activeSellers: sellerCount ?? 0,
    totals: aggregateOrders((orders ?? []) as never),
    productsAwaitingPickup: (pickups ?? []).reduce((n, p) => n + (p.expected_quantity ?? 0), 0),
    clubLeaderboard: Array.from(byClub.entries())
      .map(([clubId, v]) => ({ clubId, clubName: clubNames.get(clubId) ?? "Ukjent klubb", ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
  };
}

export async function listClubs(): Promise<(Club & { teamCount: number; campaignCount: number })[]> {
  const supabase = await createServerSupabase();
  const { data: clubs } = await supabase.from("clubs").select("*").order("name");
  const { data: teams } = await supabase.from("teams").select("id, club_id");
  const { data: campaigns } = await supabase.from("campaigns").select("id, club_id");

  return (clubs ?? []).map((club) => ({
    ...(club as Club),
    teamCount: (teams ?? []).filter((t) => t.club_id === club.id).length,
    campaignCount: (campaigns ?? []).filter((c) => c.club_id === club.id).length,
  }));
}

export async function getClubDetail(clubId: string) {
  const supabase = await createServerSupabase();
  const [{ data: club }, { data: teams }, { data: campaigns }, { data: admins }] = await Promise.all([
    supabase.from("clubs").select("*").eq("id", clubId).maybeSingle(),
    supabase.from("teams").select("*").eq("club_id", clubId).order("name"),
    supabase.from("campaigns").select("*").eq("club_id", clubId).order("created_at", { ascending: false }),
    supabase.from("club_admins").select("profile_id, profiles(first_name, last_name, email)").eq("club_id", clubId),
  ]);
  if (!club) return null;
  return {
    club: club as Club,
    teams: teams ?? [],
    campaigns: (campaigns ?? []) as Campaign[],
    admins: admins ?? [],
  };
}

export async function getCampaignTeams(campaignId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("campaign_teams").select("team_id, teams(id, name, slug)").eq("campaign_id", campaignId);
  return data ?? [];
}
