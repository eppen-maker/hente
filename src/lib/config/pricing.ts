import type { Pricing, PricingBreakdown, PricingTier, UUID } from "@/types";

/**
 * Single source of truth for money in the app.
 *
 * Nothing else may hardcode 200 / 120 / 80. Components ask
 * `resolvePricing()` for a breakdown and read `consumerPrice`,
 * `organizationPrice` and `organizationMargin` from it, so pricing can later
 * vary per product, per organization and per volume without touching the UI.
 */

export const DEFAULT_PRICING_ID = "pricing-standard-2026" as const;

export const VAT_RATE = 0.25;

export const DEMO_VOLUME_PRICING_ID = "pricing-volume-2026" as const;

export const PRICE_LISTS: Record<UUID, Pricing> = {
  /**
   * The standard dugnad agreement: 200 kr out, 120 kr in, 80 kr to the
   * organization. Flat, so every participant earns the same on every product.
   */
  [DEFAULT_PRICING_ID]: {
    id: DEFAULT_PRICING_ID,
    name: "Standard dugnadspris 2026",
    currency: "NOK",
    consumerPrice: 200,
    organizationPrice: 120,
    vatRate: VAT_RATE,
    minimumQuantity: 500,
    tiers: [{ minQuantity: 0, organizationPrice: 120, label: "Standard" }],
  },

  /**
   * Example of a negotiated volume agreement. Not used by the public
   * calculator — it exists to show that pricing varies per organization and
   * per volume without any UI change: pass `pricingId` to `resolvePricing`.
   */
  [DEMO_VOLUME_PRICING_ID]: {
    id: DEMO_VOLUME_PRICING_ID,
    name: "Volumavtale 2026",
    currency: "NOK",
    consumerPrice: 200,
    organizationPrice: 120,
    vatRate: VAT_RATE,
    minimumQuantity: 5_000,
    tiers: [
      { minQuantity: 0, organizationPrice: 120, label: "Standard" },
      { minQuantity: 5_000, organizationPrice: 118, label: "Volum 5 000+" },
      { minQuantity: 10_000, organizationPrice: 115, label: "Volum 10 000+" },
      { minQuantity: 20_000, organizationPrice: 112, label: "Volum 20 000+" },
    ],
  },
};

/** Defaults the public calculator starts from. */
export const CALCULATOR_DEFAULTS = {
  participants: 600,
  productsPerParticipant: 10,
  profitGoal: 500_000,
  /** Quick-pick volumes. Orders are never restricted to these. */
  quickVolumes: [3_000, 5_000, 6_000, 10_000, 15_000],
  limits: {
    participants: { min: 1, max: 20_000 },
    productsPerParticipant: { min: 1, max: 100 },
    profitGoal: { min: 10_000, max: 20_000_000 },
    customVolume: { min: 500, max: 500_000 },
  },
} as const;

/** The worked example used in marketing copy, derived from the price list. */
export const SHOWCASE_EXAMPLE = {
  participants: 600,
  productsPerParticipant: 10,
} as const;

export function getPricing(pricingId: UUID = DEFAULT_PRICING_ID): Pricing {
  return PRICE_LISTS[pricingId] ?? PRICE_LISTS[DEFAULT_PRICING_ID]!;
}

function findTier(pricing: Pricing, quantity: number): PricingTier | undefined {
  if (!pricing.tiers?.length) return undefined;
  return pricing.tiers
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
}

export interface ResolvePricingInput {
  pricingId?: UUID;
  /** Total volume in the order — decides which volume tier applies. */
  quantity?: number;
  /** Per-campaign override, e.g. a negotiated consumer price. */
  overrides?: Partial<Pick<Pricing, "consumerPrice" | "organizationPrice">>;
}

/**
 * Resolves the effective economics for a given price list and volume.
 * This is the only function that should compute a margin.
 */
export function resolvePricing({
  pricingId = DEFAULT_PRICING_ID,
  quantity = 0,
  overrides,
}: ResolvePricingInput = {}): PricingBreakdown {
  const pricing = getPricing(pricingId);
  const tier = findTier(pricing, quantity);

  const consumerPrice = overrides?.consumerPrice ?? pricing.consumerPrice;
  const organizationPrice =
    overrides?.organizationPrice ??
    tier?.organizationPrice ??
    pricing.organizationPrice;

  const organizationMargin = consumerPrice - organizationPrice;

  return {
    currency: pricing.currency,
    consumerPrice,
    organizationPrice,
    organizationMargin,
    marginRate: consumerPrice > 0 ? organizationMargin / consumerPrice : 0,
    vatRate: pricing.vatRate,
    appliedTier: tier,
  };
}

/**
 * The headline margin shown before a volume is known (200 − 120 = 80).
 * Kept as a function so copy stays in sync with the price list.
 */
export function baseMargin(pricingId: UUID = DEFAULT_PRICING_ID): number {
  const { organizationMargin } = resolvePricing({ pricingId });
  return organizationMargin;
}
