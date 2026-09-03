import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { aggregateOrders, type FinancialBreakdown } from "@/lib/finance";
import type { Campaign, Order, Seller, SellerPickup } from "@/lib/types";

export interface SellerOrderRow {
  id: string;
  customerName: string;
  customerPhone: string | null;
  quantity: number;
  paid: boolean;
  status: Order["status"];
  createdAt: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export interface SellerDashboard {
  seller: Seller;
  campaign: Campaign;
  clubName: string;
  teamName: string;
  totals: FinancialBreakdown;
  customerCount: number;
  orders: SellerOrderRow[];
  pickup: SellerPickup | null;
  shareUrl: string;
}

/** Every seller record belonging to the signed-in profile, newest campaign first. */
export async function getSellerRecordsForProfile(profileId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("sellers")
    .select("id, campaign_id, team_id, first_name, last_name, slug, seller_code, sales_target, active, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Full seller dashboard payload. Reads run under RLS as the signed-in user. */
export async function getSellerDashboard(sellerId: string, appUrl: string): Promise<SellerDashboard | null> {
  const supabase = await createServerSupabase();

  const { data: seller } = await supabase
    .from("sellers")
    .select(
      "id, campaign_id, team_id, profile_id, first_name, last_name, slug, phone, email, seller_code, sales_target, active, teams!inner(id, name, slug, club_id, clubs!inner(id, name, slug)), campaigns!inner(id, club_id, name, slug, description, start_date, end_date, sales_target_quantity, sales_target_amount, retail_price_inc_vat, club_earning_per_unit, vat_rate_bp, status, leaderboard_enabled, pickup_location, pickup_date, closed_at)",
    )
    .eq("id", sellerId)
    .maybeSingle();
  if (!seller) return null;

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const team = one(seller.teams as unknown as { id: string; name: string; slug: string; clubs: { name: string; slug: string } | { name: string; slug: string }[] }[]);
  const club = one(team?.clubs as never);
  const campaign = one(seller.campaigns as unknown as Campaign[]);
  if (!team || !campaign) return null;

  const { data: orderRows } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, quantity, status, created_at, gross_amount, club_earning_amount, sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat, order_deliveries(status, delivered_at)",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  const rows = orderRows ?? [];
  const paidRows = rows.filter((r) => r.status === "PAID");

  const { data: pickup } = await supabase
    .from("seller_pickups")
    .select("id, campaign_id, seller_id, expected_quantity, actual_quantity, status, pickup_code, picked_up_at, confirmed_by")
    .eq("seller_id", sellerId)
    .maybeSingle();

  const clubRecord = club as unknown as { name: string; slug: string } | undefined;

  return {
    seller: seller as unknown as Seller,
    campaign,
    clubName: clubRecord?.name ?? "",
    teamName: team.name,
    totals: aggregateOrders(paidRows as never),
    customerCount: paidRows.length,
    orders: rows.map((r) => {
      const delivery = one(r.order_deliveries as unknown as { status: string; delivered_at: string | null }[]);
      return {
        id: r.id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        quantity: r.quantity,
        paid: r.status === "PAID",
        status: r.status as Order["status"],
        createdAt: r.created_at,
        delivered: delivery?.status === "DELIVERED",
        deliveredAt: delivery?.delivered_at ?? null,
      };
    }),
    pickup: (pickup as SellerPickup | null) ?? null,
    shareUrl: `${appUrl}/s/${clubRecord?.slug ?? ""}/${team.slug}/${seller.slug}`,
  };
}
