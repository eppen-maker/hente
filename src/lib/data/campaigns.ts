import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { aggregateOrders } from "@/lib/finance";
import { computePickupRequirements } from "@/lib/pickup";
import { recordAudit } from "./audit";
import type { CampaignStatus } from "@/lib/types";

export interface CloseCampaignResult {
  totalQuantity: number;
  sellersWithProducts: number;
  pickupsCreated: number;
  clubEarning: number;
  grossAmount: number;
}

/**
 * Close a campaign: stop new orders, compute the pickup requirement per seller
 * and create/refresh their pickup records. Safe to run more than once.
 */
/**
 * Closes a campaign: stops new orders and reports the pickup requirement.
 *
 * Pickup records no longer need creating here — a database trigger keeps
 * `seller_pickups` in step with paid orders throughout the campaign, so the
 * clubhouse can hand out goods before the campaign ends. Closing is now purely
 * a status change plus the final tally. Safe to run more than once.
 */
export async function closeCampaign(campaignId: string, actorProfileId: string): Promise<CloseCampaignResult> {
  const supabase = await createServerSupabase();

  const { data: orders } = await supabase
    .from("orders")
    .select("seller_id, quantity, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat")
    .eq("campaign_id", campaignId)
    .eq("status", "PAID");

  const paid = orders ?? [];
  const totals = aggregateOrders(paid as never);
  const requirements = computePickupRequirements(paid.map((o) => ({ sellerId: o.seller_id, quantity: o.quantity })));

  await supabase
    .from("campaigns")
    .update({ status: "PICKUP" satisfies CampaignStatus, closed_at: new Date().toISOString() })
    .eq("id", campaignId);

  const { count: pickupCount } = await supabase
    .from("seller_pickups")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .neq("status", "NOT_READY");

  await recordAudit({
    actorProfileId,
    action: "campaign.closed",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { totalQuantity: totals.quantity, sellersWithProducts: requirements.length },
  });

  return {
    totalQuantity: totals.quantity,
    sellersWithProducts: requirements.length,
    pickupsCreated: pickupCount ?? requirements.length,
    clubEarning: totals.clubEarningAmount,
    grossAmount: totals.grossAmount,
  };
}

export async function setCampaignStatus(campaignId: string, status: CampaignStatus, actorProfileId: string) {
  const supabase = await createServerSupabase();
  await supabase.from("campaigns").update({ status }).eq("id", campaignId);
  await recordAudit({ actorProfileId, action: `campaign.status.${status.toLowerCase()}`, entityType: "campaign", entityId: campaignId });
}

/** Aggregated closing report, also used as the source for the CSV exports. */
export async function getCampaignExportData(campaignId: string) {
  const supabase = await createServerSupabase();

  const [{ data: campaign }, { data: orders }, { data: pickups }] = await Promise.all([
    supabase.from("campaigns").select("*, clubs!inner(name)").eq("id", campaignId).maybeSingle(),
    supabase
      .from("orders")
      .select(
        "id, quantity, customer_name, customer_phone, customer_email, payment_status, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat, created_at, sellers!inner(id, first_name, last_name, seller_code), teams!inner(id, name), clubs!inner(name)",
      )
      .eq("campaign_id", campaignId)
      .eq("status", "PAID")
      .order("created_at"),
    supabase.from("seller_pickups").select("seller_id, expected_quantity, status, pickup_code").eq("campaign_id", campaignId),
  ]);

  if (!campaign) return null;
  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

  const rows = (orders ?? []).map((o) => {
    const seller = one(o.sellers as unknown as { id: string; first_name: string; last_name: string; seller_code: string }[])!;
    const team = one(o.teams as unknown as { id: string; name: string }[])!;
    const club = one(o.clubs as unknown as { name: string }[])!;
    return {
      orderId: o.id,
      sellerId: seller.id,
      sellerName: `${seller.first_name} ${seller.last_name}`.trim(),
      sellerCode: seller.seller_code,
      teamId: team.id,
      teamName: team.name,
      clubName: club.name,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerEmail: o.customer_email,
      invoiced: o.payment_status === "INVOICED",
      quantity: o.quantity,
      grossAmount: o.gross_amount,
      clubEarningAmount: o.club_earning_amount,
      sorkystAmountIncVat: o.sorkyst_amount_inc_vat,
      vatAmount: o.vat_amount,
      sorkystRevenueExVat: o.sorkyst_revenue_ex_vat,
      createdAt: o.created_at,
    };
  });

  const clubs = campaign.clubs as unknown as { name: string } | { name: string }[];
  return {
    campaign: campaign as unknown as { id: string; name: string; slug: string; payment_mode: "ONLINE" | "INVOICE" },
    clubName: (Array.isArray(clubs) ? clubs[0]?.name : clubs?.name) ?? "",
    rows,
    pickups: pickups ?? [],
  };
}
