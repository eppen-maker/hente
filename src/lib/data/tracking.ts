import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PickupStatus } from "@/lib/types";

export interface TrackedOrder {
  orderId: string;
  customerName: string;
  customerPhone: string | null;
  quantity: number;
  paid: boolean;
  invoiced: boolean;
  delivered: boolean;
  deliveredAt: string | null;
  createdAt: string;
}

export interface TrackedSeller {
  sellerId: string;
  name: string;
  teamId: string;
  teamName: string;
  sellerCode: string;
  pickupCode: string | null;
  pickupStatus: PickupStatus;
  pickedUpAt: string | null;
  ordered: number;
  delivered: number;
  orders: TrackedOrder[];
  /** Lower-cased haystack for the search box: name, team, codes, customers, phones. */
  search: string;
}

export interface CampaignTracking {
  sellers: TrackedSeller[];
  teams: { id: string; name: string }[];
  totals: {
    ordered: number;
    delivered: number;
    remaining: number;
    customers: number;
    sellersReady: number;
    sellersPickedUp: number;
  };
}

/**
 * Everything the tracking screen needs, in three queries. Reads run under RLS,
 * so a club admin only ever sees their own campaign.
 */
export async function getCampaignTracking(campaignId: string, teamFilter?: string[] | null): Promise<CampaignTracking> {
  const supabase = await createServerSupabase();

  let sellerQuery = supabase
    .from("sellers")
    .select("id, team_id, first_name, last_name, seller_code, teams!inner(id, name)")
    .eq("campaign_id", campaignId);
  if (teamFilter && teamFilter.length) sellerQuery = sellerQuery.in("team_id", teamFilter);

  const [{ data: sellers }, { data: orders }, { data: pickups }] = await Promise.all([
    sellerQuery,
    supabase
      .from("orders")
      .select("id, seller_id, customer_name, customer_phone, quantity, status, payment_status, created_at, order_deliveries(status, delivered_at)")
      .eq("campaign_id", campaignId)
      .order("created_at"),
    supabase
      .from("seller_pickups")
      .select("seller_id, status, pickup_code, picked_up_at, expected_quantity")
      .eq("campaign_id", campaignId),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const pickupBySeller = new Map((pickups ?? []).map((p) => [p.seller_id as string, p]));

  const ordersBySeller = new Map<string, TrackedOrder[]>();
  for (const order of orders ?? []) {
    if (order.status !== "PAID") continue;
    const delivery = one(order.order_deliveries as unknown as { status: string; delivered_at: string | null }[]);
    const list = ordersBySeller.get(order.seller_id) ?? [];
    list.push({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      quantity: order.quantity,
      paid: true,
      invoiced: order.payment_status === "INVOICED",
      delivered: delivery?.status === "DELIVERED",
      deliveredAt: delivery?.delivered_at ?? null,
      createdAt: order.created_at,
    });
    ordersBySeller.set(order.seller_id, list);
  }

  const teams = new Map<string, string>();
  const tracked: TrackedSeller[] = (sellers ?? []).map((s) => {
    const team = one(s.teams as unknown as { id: string; name: string }[]);
    if (team) teams.set(team.id, team.name);

    const sellerOrders = ordersBySeller.get(s.id) ?? [];
    const pickup = pickupBySeller.get(s.id);
    const name = `${s.first_name} ${s.last_name}`.trim();
    const ordered = sellerOrders.reduce((n, o) => n + o.quantity, 0);
    const delivered = sellerOrders.filter((o) => o.delivered).reduce((n, o) => n + o.quantity, 0);

    return {
      sellerId: s.id,
      name,
      teamId: s.team_id,
      teamName: team?.name ?? "",
      sellerCode: s.seller_code,
      pickupCode: pickup?.pickup_code ?? null,
      pickupStatus: (pickup?.status as PickupStatus) ?? "NOT_READY",
      pickedUpAt: pickup?.picked_up_at ?? null,
      ordered,
      delivered,
      orders: sellerOrders,
      search: [name, team?.name ?? "", s.seller_code, pickup?.pickup_code ?? "", ...sellerOrders.flatMap((o) => [o.customerName, o.customerPhone ?? ""])]
        .join(" ")
        .toLowerCase(),
    };
  });

  tracked.sort((a, b) => b.ordered - a.ordered || a.name.localeCompare(b.name));

  return {
    sellers: tracked,
    teams: Array.from(teams, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    totals: {
      ordered: tracked.reduce((n, s) => n + s.ordered, 0),
      delivered: tracked.reduce((n, s) => n + s.delivered, 0),
      remaining: tracked.reduce((n, s) => n + (s.ordered - s.delivered), 0),
      customers: tracked.reduce((n, s) => n + s.orders.length, 0),
      sellersReady: tracked.filter((s) => s.pickupStatus === "READY").length,
      sellersPickedUp: tracked.filter((s) => s.pickupStatus === "PICKED_UP").length,
    },
  };
}
