import { resolvePricing, type ResolvePricingInput } from "@/lib/config/pricing";
import type { CampaignProjection, PricingBreakdown } from "@/types";

/**
 * Pure fundraising math. Every number the calculator shows comes from here,
 * and every price comes from `resolvePricing` — never from a literal.
 */

export interface ProfitInput {
  totalProducts: number;
  pricing: PricingBreakdown;
}

/** Total the organization keeps: products × margin per product. */
export function calculateProfit({ totalProducts, pricing }: ProfitInput): number {
  return Math.max(0, Math.round(totalProducts * pricing.organizationMargin));
}

/** What end customers pay in total. */
export function calculateConsumerSales({
  totalProducts,
  pricing,
}: ProfitInput): number {
  return Math.max(0, Math.round(totalProducts * pricing.consumerPrice));
}

/** What the organization pays SØRKYST. */
export function calculateOrganizationCost({
  totalProducts,
  pricing,
}: ProfitInput): number {
  return Math.max(0, Math.round(totalProducts * pricing.organizationPrice));
}

/**
 * How many products are needed to reach a profit goal.
 * Rounded up — you cannot sell a fraction of a product.
 */
export function calculateRequiredProducts(
  desiredProfit: number,
  profitPerProduct: number,
): number {
  if (profitPerProduct <= 0) return 0;
  return Math.ceil(Math.max(0, desiredProfit) / profitPerProduct);
}

/**
 * How many products each participant must sell.
 * Always rounded up to a whole product, so the goal is reached rather than
 * just missed. The UI states this explicitly.
 */
export function calculateProductsPerParticipant(
  totalProducts: number,
  participants: number,
): number {
  if (participants <= 0) return 0;
  return Math.ceil(Math.max(0, totalProducts) / participants);
}

/* -------------------------------------------------------------------------- */
/* Projections                                                                 */
/* -------------------------------------------------------------------------- */

interface BaseProjectionInput extends ResolvePricingInput {
  participants: number;
}

function buildProjection(
  participants: number,
  productsPerParticipant: number,
  pricingInput: ResolvePricingInput,
  extras: { roundedUp: boolean; profitGoal?: number },
): CampaignProjection {
  const safeParticipants = Math.max(0, Math.floor(participants));
  const safePerParticipant = Math.max(0, Math.floor(productsPerParticipant));
  const totalProducts = safeParticipants * safePerParticipant;

  // Volume decides the tier, so pricing is resolved after the volume is known.
  const pricing = resolvePricing({ ...pricingInput, quantity: totalProducts });
  const organizationProfit = calculateProfit({ totalProducts, pricing });

  return {
    participants: safeParticipants,
    productsPerParticipant: safePerParticipant,
    totalProducts,
    organizationProfit,
    totalConsumerSales: calculateConsumerSales({ totalProducts, pricing }),
    totalOrganizationCost: calculateOrganizationCost({ totalProducts, pricing }),
    profitPerProduct: pricing.organizationMargin,
    profitPerParticipant:
      safeParticipants > 0 ? Math.round(organizationProfit / safeParticipants) : 0,
    pricing,
    roundedUp: extras.roundedUp,
    profitGoal: extras.profitGoal,
  };
}

export interface VolumeProjectionInput extends BaseProjectionInput {
  productsPerParticipant: number;
}

/** Mode A — "Produkter per person". */
export function projectFromProductsPerParticipant({
  participants,
  productsPerParticipant,
  ...pricingInput
}: VolumeProjectionInput): CampaignProjection {
  return buildProjection(participants, productsPerParticipant, pricingInput, {
    roundedUp: false,
  });
}

export interface ProfitGoalProjectionInput extends BaseProjectionInput {
  profitGoal: number;
}

/**
 * Mode B — "Ønsket fortjeneste".
 *
 * Required products are derived from the goal, then divided across
 * participants and rounded UP. Rounding up means the campaign usually lands
 * slightly above the goal; `roundedUp` lets the UI say so.
 */
export function projectFromProfitGoal({
  participants,
  profitGoal,
  ...pricingInput
}: ProfitGoalProjectionInput): CampaignProjection {
  const safeParticipants = Math.max(1, Math.floor(participants));

  // First pass: price at the raw required volume, then re-check once the
  // rounded volume is known, in case it crosses into a better tier.
  const firstPass = resolvePricing(pricingInput);
  const requiredProducts = calculateRequiredProducts(
    profitGoal,
    firstPass.organizationMargin,
  );
  const tieredPricing = resolvePricing({
    ...pricingInput,
    quantity: requiredProducts,
  });
  const adjustedRequired = calculateRequiredProducts(
    profitGoal,
    tieredPricing.organizationMargin,
  );

  const perParticipant = calculateProductsPerParticipant(
    adjustedRequired,
    safeParticipants,
  );

  const projection = buildProjection(
    safeParticipants,
    perParticipant,
    pricingInput,
    {
      roundedUp: perParticipant * safeParticipants > adjustedRequired,
      profitGoal,
    },
  );

  return projection;
}

export interface VolumeCardProjectionInput extends BaseProjectionInput {
  totalProducts: number;
}

/**
 * Quick-volume cards: a fixed total volume spread across the current
 * participant count.
 */
export function projectFromTotalProducts({
  participants,
  totalProducts,
  ...pricingInput
}: VolumeCardProjectionInput): CampaignProjection {
  const safeParticipants = Math.max(1, Math.floor(participants));
  const safeTotal = Math.max(0, Math.floor(totalProducts));
  const pricing = resolvePricing({ ...pricingInput, quantity: safeTotal });
  const organizationProfit = calculateProfit({ totalProducts: safeTotal, pricing });

  return {
    participants: safeParticipants,
    productsPerParticipant: calculateProductsPerParticipant(
      safeTotal,
      safeParticipants,
    ),
    totalProducts: safeTotal,
    organizationProfit,
    totalConsumerSales: calculateConsumerSales({ totalProducts: safeTotal, pricing }),
    totalOrganizationCost: calculateOrganizationCost({
      totalProducts: safeTotal,
      pricing,
    }),
    profitPerProduct: pricing.organizationMargin,
    profitPerParticipant: Math.round(organizationProfit / safeParticipants),
    pricing,
    roundedUp: false,
  };
}

/**
 * Picks the quick-volume option closest to a sensible effort level for the
 * current participant count (a default of ~10 products per participant),
 * so one card can be highlighted as recommended.
 */
export function recommendVolume(
  participants: number,
  volumes: readonly number[],
  targetPerParticipant: number,
): number | null {
  if (!volumes.length || participants <= 0) return null;
  const ideal = participants * targetPerParticipant;
  return volumes.reduce((best, volume) =>
    Math.abs(volume - ideal) < Math.abs(best - ideal) ? volume : best,
  );
}
