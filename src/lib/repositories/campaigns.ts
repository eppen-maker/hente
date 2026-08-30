import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Campaign,
  CampaignPricing,
  CampaignWithPricing,
  PricingTier,
  PublicOrganization,
} from "@/types";

import { getDefaultProduct, getProductById, mapProduct } from "./catalog";
import { readSeeded } from "./store";

/** Statuses a campaign link is reachable at. Mirrors the RLS policy. */
export const PUBLIC_CAMPAIGN_STATUSES = ["planned", "active"] as const;

function isPublic(campaign: Campaign): boolean {
  return (PUBLIC_CAMPAIGN_STATUSES as readonly string[]).includes(campaign.status);
}

function mapCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    slug: String(row.slug),
    participants: Number(row.participants ?? 0),
    targetProfit: row.target_profit == null ? null : Number(row.target_profit),
    status: row.status as Campaign["status"],
    startDate: (row.start_date as string | null) ?? null,
    orderDeadline: (row.order_deadline as string | null) ?? null,
    deliveryDate: (row.delivery_date as string | null) ?? null,
    createdAt: (row.created_at as string | undefined) ?? undefined,
    updatedAt: (row.updated_at as string | undefined) ?? undefined,
  };
}

function mapCampaignPricing(row: Record<string, unknown>): CampaignPricing {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    productId: String(row.product_id),
    partnerPrice: Number(row.partner_price),
    consumerPrice: Number(row.consumer_price),
    organizationMargin: Number(row.organization_margin),
  };
}

function mapVolumeTier(row: Record<string, unknown>): PricingTier {
  return {
    minQuantity: Number(row.min_quantity),
    maxQuantity: row.max_quantity == null ? null : Number(row.max_quantity),
    organizationPrice: Number(row.partner_price),
    label: (row.label as string | null) ?? undefined,
  };
}

async function fromLocalStore(slug: string): Promise<CampaignWithPricing | null> {
  const campaigns = await readSeeded("campaigns");
  const campaign = campaigns.find((item) => item.slug === slug);
  if (!campaign || !isPublic(campaign)) return null;

  const organizations = await readSeeded("organizations");
  const organization = organizations.find((item) => item.id === campaign.organizationId);
  if (!organization) return null;

  const agreements = await readSeeded("campaign-pricing");
  const pricing = agreements.find((item) => item.campaignId === campaign.id) ?? null;
  const product = pricing
    ? ((await getProductById(pricing.productId)) ?? (await getDefaultProduct()))
    : await getDefaultProduct();

  const tiers = await readSeeded("volume-pricing");
  const forProduct = tiers.filter((tier) => tier.productId === product.id);
  const campaignTiers = forProduct.filter((tier) => tier.campaignId === campaign.id);

  return {
    campaign,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      city: organization.city ?? null,
    },
    product,
    pricing,
    volumeTiers: (campaignTiers.length ? campaignTiers : forProduct).map((tier) => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity ?? null,
      organizationPrice: tier.organizationPrice,
      label: tier.label,
    })),
  };
}

/**
 * Loads everything a campaign order page needs.
 *
 * Reads from Supabase when configured, and from the local demo fixtures
 * otherwise, so partner links work in local development with no database.
 * Returns null for unknown or unpublished campaigns.
 */
export async function getCampaignBySlug(
  slug: string,
): Promise<CampaignWithPricing | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fromLocalStore(slug);

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `*,
       organizations!inner (id, name, slug, city),
       campaign_pricing (*, products (*))`,
    )
    .eq("slug", slug)
    .in("status", PUBLIC_CAMPAIGN_STATUSES)
    .maybeSingle();

  if (error) {
    console.error("Supabase campaign query failed:", error.message);
    return fromLocalStore(slug);
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const campaign = mapCampaign(row);

  const organizationRow = row.organizations as Record<string, unknown> | null;
  if (!organizationRow) return null;
  const organization: PublicOrganization = {
    id: String(organizationRow.id),
    name: String(organizationRow.name),
    slug: String(organizationRow.slug),
    city: (organizationRow.city as string | null) ?? null,
  };

  const pricingRows = (row.campaign_pricing ?? []) as Record<string, unknown>[];
  const pricingRow = pricingRows[0];
  const pricing = pricingRow ? mapCampaignPricing(pricingRow) : null;
  const productRow = pricingRow?.products as Record<string, unknown> | undefined;
  const product = productRow ? mapProduct(productRow) : await getDefaultProduct();

  // Volume tiers are optional: campaign-specific first, then product defaults.
  const { data: tierRows } = await supabase
    .from("volume_pricing")
    .select("*")
    .eq("product_id", product.id)
    .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
    .order("min_quantity", { ascending: true });

  const tiers = (tierRows ?? []) as Record<string, unknown>[];
  const campaignTiers = tiers.filter((tier) => tier.campaign_id != null);
  const volumeTiers = (campaignTiers.length ? campaignTiers : tiers).map(mapVolumeTier);

  return { campaign, organization, product, pricing, volumeTiers };
}

/** Campaign slugs available locally. Used by the development index page. */
export async function listPublicCampaigns(): Promise<CampaignWithPricing[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const campaigns = await readSeeded("campaigns");
    const resolved = await Promise.all(
      campaigns.filter(isPublic).map((campaign) => fromLocalStore(campaign.slug)),
    );
    return resolved.filter((item): item is CampaignWithPricing => item !== null);
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("slug")
    .in("status", PUBLIC_CAMPAIGN_STATUSES)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const resolved = await Promise.all(
    data.map((row) => getCampaignBySlug(String((row as { slug: unknown }).slug))),
  );
  return resolved.filter((item): item is CampaignWithPricing => item !== null);
}
