import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { aggregateOrders } from "@/lib/finance";
import { randomCode } from "@/lib/slug";
import { computePickupRequirements, pickupStatusFor } from "@/lib/pickup";
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
export async function closeCampaign(campaignId: string, actorProfileId: string): Promise<CloseCampaignResult> {
  const supabase = await createServerSupabase();

  const { data: orders } = await supabase
    .from("orders")
    .select("seller_id, quantity, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat")
    .eq("campaign_id", campaignId)
    .eq("status", "PAID");

  const paid = orders ?? [];
  const totals = aggregateOrders(paid as never);

  const quantityBySeller = new Map(
    computePickupRequirements(paid.map((o) => ({ sellerId: o.seller_id, quantity: o.quantity }))).map((r) => [
      r.sellerId,
      r.quantity,
    ]),
  );

  const { data: existing } = await supabase
    .from("seller_pickups")
    .select("id, seller_id, status, pickup_code")
    .eq("campaign_id", campaignId);
  const existingBySeller = new Map((existing ?? []).map((p) => [p.seller_id as string, p]));

  const { data: sellers } = await supabase.from("sellers").select("id").eq("campaign_id", campaignId);

  let pickupsCreated = 0;
  for (const seller of sellers ?? []) {
    const expected = quantityBySeller.get(seller.id) ?? 0;
    const current = existingBySeller.get(seller.id);
    const status = pickupStatusFor(expected, false);

    if (!current) {
      await supabase.from("seller_pickups").insert({
        campaign_id: campaignId,
        seller_id: seller.id,
        expected_quantity: expected,
        status,
        pickup_code: await uniquePickupCode(),
      });
      pickupsCreated += 1;
    } else if (current.status !== "PICKED_UP") {
      await supabase.from("seller_pickups").update({ expected_quantity: expected, status }).eq("id", current.id);
    }
  }

  await supabase
    .from("campaigns")
    .update({ status: "PICKUP" satisfies CampaignStatus, closed_at: new Date().toISOString() })
    .eq("id", campaignId);

  await recordAudit({
    actorProfileId,
    action: "campaign.closed",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { totalQuantity: totals.quantity, pickupsCreated },
  });

  return {
    totalQuantity: totals.quantity,
    sellersWithProducts: quantityBySeller.size,
    pickupsCreated,
    clubEarning: totals.clubEarningAmount,
    grossAmount: totals.grossAmount,
  };
}

async function uniquePickupCode(): Promise<string> {
  const supabase = await createServerSupabase();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode(6);
    const { data } = await supabase.from("seller_pickups").select("id").eq("pickup_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not allocate a unique pickup code");
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
        "id, quantity, customer_name, customer_phone, customer_email, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat, created_at, sellers!inner(id, first_name, last_name, seller_code), teams!inner(id, name), clubs!inner(name)",
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
    campaign: campaign as unknown as { id: string; name: string; slug: string },
    clubName: (Array.isArray(clubs) ? clubs[0]?.name : clubs?.name) ?? "",
    rows,
    pickups: pickups ?? [],
  };
}
