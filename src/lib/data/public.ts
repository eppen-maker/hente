import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
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
 * Reads through the service-role client with a deliberately narrow projection:
 * no customer rows, no contact details, no financial aggregates leave this
 * function, so nothing personal is reachable from a public URL.
 */
export async function getPublicSellerPage(
  clubSlug: string,
  teamSlug: string,
  sellerSlug: string,
): Promise<PublicSellerPage | null> {
  const supabase = createAdminSupabase();

  const { data: club } = await supabase.from("clubs").select("id, name, slug, active").eq("slug", clubSlug).maybeSingle();
  if (!club || !club.active) return null;

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, slug, club_id, active")
    .eq("club_id", club.id)
    .eq("slug", teamSlug)
    .maybeSingle();
  if (!team || !team.active) return null;

  const { data: seller } = await supabase
    .from("sellers")
    .select(
      "id, first_name, last_name, slug, sales_target, active, campaign_id, campaigns!inner(id, name, status, retail_price_inc_vat, club_earning_per_unit, vat_rate_bp, end_date, pickup_location, club_id)",
    )
    .eq("team_id", team.id)
    .eq("slug", sellerSlug)
    .maybeSingle();
  if (!seller) return null;

  const campaign = (Array.isArray(seller.campaigns) ? seller.campaigns[0] : seller.campaigns) as
    | (PublicSellerPage["campaign"] & { club_id: string })
    | undefined;
  if (!campaign || campaign.club_id !== club.id) return null;

  return {
    club: { id: club.id, name: club.name, slug: club.slug },
    team: { id: team.id, name: team.name, slug: team.slug },
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      retail_price_inc_vat: campaign.retail_price_inc_vat,
      club_earning_per_unit: campaign.club_earning_per_unit,
      vat_rate_bp: campaign.vat_rate_bp,
      end_date: campaign.end_date,
      pickup_location: campaign.pickup_location,
    },
    seller: {
      id: seller.id,
      first_name: seller.first_name,
      last_name: seller.last_name,
      slug: seller.slug,
      sales_target: seller.sales_target,
      active: seller.active,
    },
  };
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

/** Order confirmation shown right after payment. Contains no other customer's data. */
export async function getOrderConfirmation(orderId: string): Promise<PublicOrderConfirmation | null> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, quantity, gross_amount, club_earning_amount, status, sellers!inner(first_name, last_name), teams!inner(name), clubs!inner(name), campaigns!inner(name, pickup_location)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return null;

  const one = <T,>(v: T | T[] | null): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const seller = one(data.sellers as { first_name: string; last_name: string }[]);
  const team = one(data.teams as { name: string }[]);
  const club = one(data.clubs as { name: string }[]);
  const campaign = one(data.campaigns as { name: string; pickup_location: string | null }[]);

  return {
    id: data.id,
    quantity: data.quantity,
    grossAmount: data.gross_amount,
    clubEarningAmount: data.club_earning_amount,
    status: data.status,
    sellerFirstName: seller?.first_name ?? "",
    sellerLastName: seller?.last_name ?? "",
    teamName: team?.name ?? "",
    clubName: club?.name ?? "",
    pickupLocation: campaign?.pickup_location ?? null,
    campaignName: campaign?.name ?? "",
  };
}
