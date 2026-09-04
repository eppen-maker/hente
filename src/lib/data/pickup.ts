import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeCode } from "@/lib/slug";
import type { PickupStatus } from "@/lib/types";

export interface PickupCandidate {
  sellerId: string;
  pickupId: string | null;
  name: string;
  teamName: string;
  clubName: string;
  pickupCode: string | null;
  status: PickupStatus;
  expectedQuantity: number;
  actualQuantity: number | null;
  pickedUpAt: string | null;
  confirmedByName: string | null;
  orders: { customerName: string; quantity: number; delivered: boolean }[];
}

/**
 * Pickup lookup for the clubhouse screen. Callers must have already passed
 * `requireCampaignAccess`, which is why the service-role client is safe here.
 */
export async function searchPickupCandidates(campaignId: string, query: string): Promise<PickupCandidate[]> {
  const supabase = await createServerSupabase();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const code = normalizeCode(trimmed);
  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, first_name, last_name, seller_code, teams!inner(name, clubs!inner(name))")
    .eq("campaign_id", campaignId)
    .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,seller_code.eq.${code}`)
    .limit(25);

  const sellerIds = (sellers ?? []).map((s) => s.id);

  // A pickup code may be searched directly even when the name does not match.
  const { data: byCode } = await supabase
    .from("seller_pickups")
    .select("seller_id")
    .eq("campaign_id", campaignId)
    .eq("pickup_code", code)
    .maybeSingle();
  if (byCode && !sellerIds.includes(byCode.seller_id)) sellerIds.push(byCode.seller_id);

  if (!sellerIds.length) return [];
  return getPickupCandidates(campaignId, sellerIds);
}

export async function getPickupCandidates(campaignId: string, sellerIds: string[]): Promise<PickupCandidate[]> {
  const supabase = await createServerSupabase();

  const [{ data: sellers }, { data: pickups }, { data: orders }] = await Promise.all([
    supabase
      .from("sellers")
      .select("id, first_name, last_name, seller_code, teams!inner(name, clubs!inner(name))")
      .in("id", sellerIds),
    supabase
      .from("seller_pickups")
      .select("id, seller_id, status, pickup_code, expected_quantity, actual_quantity, picked_up_at, confirmed_by, profiles(first_name, last_name)")
      .eq("campaign_id", campaignId)
      .in("seller_id", sellerIds),
    supabase
      .from("orders")
      .select("seller_id, customer_name, quantity, order_deliveries(status)")
      .eq("campaign_id", campaignId)
      .eq("status", "PAID")
      .in("seller_id", sellerIds)
      .order("created_at"),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const pickupBySeller = new Map((pickups ?? []).map((p) => [p.seller_id as string, p]));

  return (sellers ?? []).map((s) => {
    const team = one(s.teams as unknown as { name: string; clubs: { name: string } | { name: string }[] }[]);
    const club = one(team?.clubs as never) as { name: string } | undefined;
    const pickup = pickupBySeller.get(s.id);
    const sellerOrders = (orders ?? []).filter((o) => o.seller_id === s.id);
    const confirmedBy = one(pickup?.profiles as unknown as { first_name: string; last_name: string }[]);

    return {
      sellerId: s.id,
      pickupId: pickup?.id ?? null,
      name: `${s.first_name} ${s.last_name}`.trim(),
      teamName: team?.name ?? "",
      clubName: club?.name ?? "",
      pickupCode: pickup?.pickup_code ?? s.seller_code,
      status: (pickup?.status as PickupStatus) ?? "NOT_READY",
      expectedQuantity: pickup?.expected_quantity ?? sellerOrders.reduce((n, o) => n + o.quantity, 0),
      actualQuantity: pickup?.actual_quantity ?? null,
      pickedUpAt: pickup?.picked_up_at ?? null,
      confirmedByName: confirmedBy ? `${confirmedBy.first_name} ${confirmedBy.last_name}`.trim() : null,
      orders: sellerOrders.map((o) => ({
        customerName: o.customer_name,
        quantity: o.quantity,
        delivered: one(o.order_deliveries as unknown as { status: string }[])?.status === "DELIVERED",
      })),
    };
  });
}

export class PickupError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "ALREADY_PICKED_UP" | "FORBIDDEN",
    readonly pickedUpAt?: string | null,
  ) {
    super(message);
    this.name = "PickupError";
  }
}

const PICKUP_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Fant ingen utleveringsoppføring for denne selgeren",
  FORBIDDEN: "Du har ikke tilgang til denne dugnaden",
  ALREADY_PICKED_UP: "Varene er allerede hentet",
};

/**
 * Confirms a handover at the clubhouse.
 *
 * Runs as the signed-in user through `confirm_seller_pickup`, which checks
 * campaign access itself and refuses a second confirmation. Works throughout
 * the campaign — a seller can collect as soon as they have paid orders.
 */
export async function confirmPickup(args: { sellerId: string; quantity: number }) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("confirm_seller_pickup", {
    p_seller: args.sellerId,
    p_quantity: args.quantity,
  });
  if (error) throw new PickupError(error.message, "NOT_FOUND");

  const result = (data ?? {}) as { ok?: boolean; error?: string; pickedUpAt?: string | null };
  if (result.error) {
    throw new PickupError(
      PICKUP_MESSAGES[result.error] ?? "Kunne ikke bekrefte utleveringen",
      result.error as PickupError["code"],
      result.pickedUpAt,
    );
  }
  return { pickedUpAt: result.pickedUpAt ?? new Date().toISOString() };
}

/** Reverses a confirmation made by mistake. */
export async function undoPickup(sellerId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("undo_seller_pickup", { p_seller: sellerId });
  if (error) throw new PickupError(error.message, "NOT_FOUND");

  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (result.error) {
    throw new PickupError(PICKUP_MESSAGES[result.error] ?? "Kunne ikke angre", result.error as PickupError["code"]);
  }
  return { ok: true as const };
}
