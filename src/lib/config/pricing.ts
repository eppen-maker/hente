import type {
  CampaignPricing,
  Pricing,
  PricingBreakdown,
  PricingTier,
  Product,
  UUID,
} from "@/types";

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

/**
 * Whether the prices stored in `products` and `campaign_pricing` include VAT.
 * Norwegian dugnad pricing is quoted gross, so an order's net subtotal and VAT
 * are derived from the gross total rather than the other way round.
 */
export const PRICES_INCLUDE_VAT = true;

/** Smallest order SØR° accepts, in products. */
export const MIN_ORDER_QUANTITY = 500;

/** Largest order the public flow will take without a conversation. */
export const MAX_ORDER_QUANTITY = 500_000;

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

/**
 * The traditional dugnad SØR° is measured against: a small team putting in a
 * lot of hours for a modest sum. Editable — these are illustrative figures a
 * club recognises, not a claim about any particular dugnad.
 */
export const TRADITIONAL_DUGNAD = {
  participants: 25,
  hoursPerParticipant: 15,
  /** What the whole team ends up with. */
  totalProfit: 30_000,
  /** What a realistic effort looks like on the SØR° side, for the same team. */
  ambitiousProductsPerParticipant: 25,
} as const;

/** The worked example used in marketing copy, derived from the price list. */
export const SHOWCASE_EXAMPLE = {
  participants: 600,
  productsPerParticipant: 10,
} as const;

export function getPricing(pricingId: UUID = DEFAULT_PRICING_ID): Pricing {
  return PRICE_LISTS[pricingId] ?? PRICE_LISTS[DEFAULT_PRICING_ID]!;
}

/**
 * Picks the tier covering `quantity`. Tiers may be listed in any order and may
 * declare an upper bound; the highest matching lower bound wins.
 */
export function findTier(
  tiers: PricingTier[] | undefined,
  quantity: number,
): PricingTier | undefined {
  if (!tiers?.length) return undefined;
  return tiers
    .filter(
      (tier) =>
        quantity >= tier.minQuantity &&
        (tier.maxQuantity == null || quantity <= tier.maxQuantity),
    )
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
}

export interface ResolvePricingInput {
  pricingId?: UUID;
  /** Total volume in the order — decides which volume tier applies. */
  quantity?: number;
  /** Per-campaign override, e.g. a negotiated consumer price. */
  overrides?: Partial<Pick<Pricing, "consumerPrice" | "organizationPrice">>;
  /**
   * Volume tiers from the database. When present these replace the price
   * list's own tiers, so a campaign can carry its own volume agreement.
   */
  tiers?: PricingTier[];
  vatRate?: number;
  /** Marks the result as coming from a signed campaign agreement. */
  fromCampaignAgreement?: boolean;
}

/**
 * Resolves the effective economics for a given price list and volume.
 * This is the only function that should compute a margin.
 */
export function resolvePricing({
  pricingId = DEFAULT_PRICING_ID,
  quantity = 0,
  overrides,
  tiers,
  vatRate,
  fromCampaignAgreement,
}: ResolvePricingInput = {}): PricingBreakdown {
  const pricing = getPricing(pricingId);
  // Explicit tiers (from the database) win over the price list's own.
  const tier = findTier(tiers ?? pricing.tiers, quantity);

  const consumerPrice = overrides?.consumerPrice ?? pricing.consumerPrice;
  // A volume tier only ever lowers the agreed price; it never raises it.
  const agreedPrice = overrides?.organizationPrice ?? pricing.organizationPrice;
  const organizationPrice = tier
    ? Math.min(tier.organizationPrice, agreedPrice)
    : agreedPrice;

  const organizationMargin = consumerPrice - organizationPrice;

  return {
    currency: pricing.currency,
    consumerPrice,
    organizationPrice,
    organizationMargin,
    marginRate: consumerPrice > 0 ? organizationMargin / consumerPrice : 0,
    vatRate: vatRate ?? pricing.vatRate,
    appliedTier: tier,
    fromCampaignAgreement,
  };
}

/* -------------------------------------------------------------------------- */
/* Product and campaign pricing                                                */
/* -------------------------------------------------------------------------- */

export interface ResolveProductPricingInput {
  product: Product;
  /** The campaign's agreed pricing, when one exists. */
  campaignPricing?: CampaignPricing | null;
  /** Configured volume tiers. Empty or omitted means no volume discount. */
  volumeTiers?: PricingTier[];
  quantity?: number;
}

/**
 * The single place an order's unit economics are decided.
 *
 * Precedence: a configured volume tier, then the campaign's agreed price,
 * then the product's default partner price. Never a client-supplied value.
 */
export function resolveProductPricing({
  product,
  campaignPricing,
  volumeTiers,
  quantity = 0,
}: ResolveProductPricingInput): PricingBreakdown {
  return resolvePricing({
    quantity,
    tiers: volumeTiers,
    vatRate: product.vatRate,
    fromCampaignAgreement: Boolean(campaignPricing),
    overrides: {
      consumerPrice: campaignPricing?.consumerPrice ?? product.consumerPrice,
      organizationPrice:
        campaignPricing?.partnerPrice ?? product.defaultPartnerPrice,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* VAT                                                                         */
/* -------------------------------------------------------------------------- */

export interface VatSplit {
  /** Amount excluding VAT. */
  net: number;
  vat: number;
  /** Amount including VAT. */
  gross: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Splits a gross amount into net and VAT, or grosses up a net amount,
 * depending on how prices are stored.
 */
export function splitVat(amount: number, rate = VAT_RATE): VatSplit {
  if (PRICES_INCLUDE_VAT) {
    const net = round2(amount / (1 + rate));
    return { net, vat: round2(amount - net), gross: round2(amount) };
  }
  const vat = round2(amount * rate);
  return { net: round2(amount), vat, gross: round2(amount + vat) };
}

/**
 * The headline margin shown before a volume is known (200 − 120 = 80).
 * Kept as a function so copy stays in sync with the price list.
 */
export function baseMargin(pricingId: UUID = DEFAULT_PRICING_ID): number {
  const { organizationMargin } = resolvePricing({ pricingId });
  return organizationMargin;
}
