import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { aggregateOrders, type FinancialBreakdown } from "@/lib/finance";
import type { Campaign, PickupStatus } from "@/lib/types";

export interface CampaignSummary {
  campaign: Campaign;
  clubName: string;
  sellerCount: number;
  totals: FinancialBreakdown;
  orderCount: number;
}

export interface TeamBreakdownRow {
  teamId: string;
  teamName: string;
  sellerCount: number;
  quantity: number;
  clubEarning: number;
  grossAmount: number;
}

export interface SellerRow {
  sellerId: string;
  name: string;
  teamId: string;
  teamName: string;
  sellerCode: string;
  quantity: number;
  customers: number;
  clubEarning: number;
  grossAmount: number;
  salesTarget: number;
  targetReached: boolean;
  hasPendingPayments: boolean;
  pickupStatus: PickupStatus;
  pickupCode: string | null;
  pickedUpAt: string | null;
}

interface OrderAggRow {
  id: string;
  seller_id: string;
  team_id: string;
  quantity: number;
  status: string;
  gross_amount: number;
  club_earning_amount: number;
  sorkyst_amount_inc_vat: number;
  vat_amount: number;
  sorkyst_revenue_ex_vat: number;
}

/** Clubs the signed-in user may see (RLS decides; SØRKYST admins see all). */
export async function getAccessibleClubs() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("clubs").select("id, name, slug, city, active").order("name");
  return data ?? [];
}

export async function getClubCampaigns(clubId: string): Promise<CampaignSummary[]> {
  const supabase = await createServerSupabase();

  const { data: club } = await supabase.from("clubs").select("id, name").eq("id", clubId).maybeSingle();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  const summaries: CampaignSummary[] = [];
  for (const campaign of (campaigns ?? []) as Campaign[]) {
    const [{ data: orders }, { count: sellerCount }] = await Promise.all([
      supabase
        .from("orders")
        .select("quantity, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat")
        .eq("campaign_id", campaign.id)
        .eq("status", "PAID"),
      supabase.from("sellers").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id),
    ]);

    summaries.push({
      campaign,
      clubName: club?.name ?? "",
      sellerCount: sellerCount ?? 0,
      orderCount: orders?.length ?? 0,
      totals: aggregateOrders((orders ?? []) as never),
    });
  }
  return summaries;
}

export async function getCampaign(campaignId: string): Promise<{ campaign: Campaign; clubName: string } | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("campaigns").select("*, clubs!inner(name)").eq("id", campaignId).maybeSingle();
  if (!data) return null;
  const clubs = data.clubs as unknown as { name: string } | { name: string }[];
  const clubName = (Array.isArray(clubs) ? clubs[0]?.name : clubs?.name) ?? "";
  return { campaign: data as unknown as Campaign, clubName };
}

/**
 * Everything the club dashboard needs for one campaign, in three queries:
 * sellers, paid orders, pickups. Aggregation happens in TypeScript so the
 * money rules stay in one place.
 */
export async function getCampaignDetail(campaignId: string, teamFilter?: string[] | null) {
  const supabase = await createServerSupabase();

  let sellerQuery = supabase
    .from("sellers")
    .select("id, team_id, first_name, last_name, seller_code, sales_target, active, teams!inner(id, name)")
    .eq("campaign_id", campaignId);
  if (teamFilter && teamFilter.length) sellerQuery = sellerQuery.in("team_id", teamFilter);

  const [{ data: sellers }, { data: orders }, { data: pickups }] = await Promise.all([
    sellerQuery,
    supabase
      .from("orders")
      .select(
        "id, seller_id, team_id, quantity, status, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat",
      )
      .eq("campaign_id", campaignId),
    supabase
      .from("seller_pickups")
      .select("seller_id, status, pickup_code, picked_up_at, expected_quantity")
      .eq("campaign_id", campaignId),
  ]);

  const orderRows = (orders ?? []) as OrderAggRow[];
  const paidOrders = orderRows.filter((o) => o.status === "PAID");
  const pickupBySeller = new Map((pickups ?? []).map((p) => [p.seller_id as string, p]));

  const bySeller = new Map<string, OrderAggRow[]>();
  for (const order of paidOrders) {
    const list = bySeller.get(order.seller_id) ?? [];
    list.push(order);
    bySeller.set(order.seller_id, list);
  }
  const pendingBySeller = new Set(orderRows.filter((o) => o.status === "PENDING").map((o) => o.seller_id));

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

  const sellerRows: SellerRow[] = (sellers ?? []).map((s) => {
    const team = one(s.teams as unknown as { id: string; name: string }[]);
    const sellerOrders = bySeller.get(s.id) ?? [];
    const totals = aggregateOrders(sellerOrders as never);
    const pickup = pickupBySeller.get(s.id);
    return {
      sellerId: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      teamId: s.team_id,
      teamName: team?.name ?? "",
      sellerCode: s.seller_code,
      quantity: totals.quantity,
      customers: sellerOrders.length,
      clubEarning: totals.clubEarningAmount,
      grossAmount: totals.grossAmount,
      salesTarget: s.sales_target,
      targetReached: s.sales_target > 0 && totals.quantity >= s.sales_target,
      hasPendingPayments: pendingBySeller.has(s.id),
      pickupStatus: (pickup?.status as PickupStatus) ?? "NOT_READY",
      pickupCode: pickup?.pickup_code ?? null,
      pickedUpAt: pickup?.picked_up_at ?? null,
    };
  });

  const teamMap = new Map<string, TeamBreakdownRow>();
  for (const row of sellerRows) {
    const existing = teamMap.get(row.teamId) ?? {
      teamId: row.teamId,
      teamName: row.teamName,
      sellerCount: 0,
      quantity: 0,
      clubEarning: 0,
      grossAmount: 0,
    };
    existing.sellerCount += 1;
    existing.quantity += row.quantity;
    existing.clubEarning += row.clubEarning;
    existing.grossAmount += row.grossAmount;
    teamMap.set(row.teamId, existing);
  }

  return {
    sellers: sellerRows.sort((a, b) => b.quantity - a.quantity),
    teams: Array.from(teamMap.values()).sort((a, b) => b.quantity - a.quantity),
    totals: aggregateOrders(paidOrders as never),
    orderCount: paidOrders.length,
    pendingOrderCount: orderRows.length - paidOrders.length,
    awaitingPickup: sellerRows.filter((s) => s.pickupStatus !== "PICKED_UP" && s.quantity > 0).reduce((n, s) => n + s.quantity, 0),
  };
}

/** Leaderboards, only when the campaign has them enabled. */
export function buildLeaderboards(sellers: SellerRow[], teams: TeamBreakdownRow[]) {
  return {
    topSellers: [...sellers].filter((s) => s.quantity > 0).slice(0, 10),
    topTeams: [...teams].filter((t) => t.quantity > 0).slice(0, 10),
  };
}
