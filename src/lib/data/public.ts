import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Campaign, Club, Seller, Team } from "@/lib/types";

export interface PublicSellerPage {
  club: Pick<Club, "id" | "name" | "slug">;
  team: Pick<Team, "id" | "name" | "slug">;
  campaign: Pick<
    Campaign,
    "id" | "name" | "status" | "retail_price_inc_vat" | "club_earning_per_unit" | "vat_rate_bp" | "end_date" | "pickup_location"
  >;
  seller: Pick<Seller, "id" | "first_name" | "last_name" | "slug" | "sales_target" | "active">;
}

/**
 * Public sales page lookup.
 *
 * Goes through the `public_seller_page` database function, which is the only
 * thing an unauthenticated visitor may call. It returns a fixed, narrow
 * projection — no customer rows, no contact details, no totals — so nothing
 * personal is reachable from a public URL.
 */
export async function getPublicSellerPage(
  clubSlug: string,
  teamSlug: string,
  sellerSlug: string,
): Promise<PublicSellerPage | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("public_seller_page", {
    p_club: clubSlug,
    p_team: teamSlug,
    p_seller: sellerSlug,
  });
  if (error || !data) return null;
  return data as unknown as PublicSellerPage;
}

export interface PublicOrderConfirmation {
  id: string;
  quantity: number;
  grossAmount: number;
  clubEarningAmount: number;
  status: string;
  sellerFirstName: string;
  sellerLastName: string;
  teamName: string;
  clubName: string;
  pickupLocation: string | null;
  campaignName: string;
}

/** Receipt for one order, addressed by its unguessable id. No other customer's data. */
export async function getOrderConfirmation(orderId: string): Promise<PublicOrderConfirmation | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("public_order_confirmation", { p_order_id: orderId });
  if (error || !data) return null;
  return data as unknown as PublicOrderConfirmation;
}
