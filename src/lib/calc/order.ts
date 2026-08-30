import { resolveProductPricing, splitVat } from "@/lib/config/pricing";
import type {
  CampaignPricing,
  PricingBreakdown,
  PricingTier,
  Product,
} from "@/types";

import { calculateProductsPerParticipant } from "./fundraising";

/**
 * Authoritative order economics.
 *
 * This is the only function allowed to decide what an order costs. It runs on
 * the server with prices loaded from the database (or the local fixtures) —
 * never from the request body. The client may propose a quantity; everything
 * else is derived here.
 */

export interface OrderCalculationInput {
  product: Product;
  /** The campaign's agreed pricing, when the order belongs to a campaign. */
  campaignPricing?: CampaignPricing | null;
  volumeTiers?: PricingTier[];
  quantity: number;
  participants: number;
}

export interface OrderCalculation {
  quantity: number;
  participants: number;
  productsPerParticipant: number;
  /** Per unit, incl. VAT, what the organization pays SØR°. */
  unitPrice: number;
  /** Per unit, recommended consumer price. */
  consumerPrice: number;
  /** Per unit, what the organization keeps. */
  organizationMargin: number;
  /** quantity × unitPrice, incl. VAT. */
  lineTotal: number;
  /** Net of VAT. */
  subtotal: number;
  vat: number;
  /** Gross — what the organization is invoiced. */
  total: number;
  /** quantity × organizationMargin. */
  organizationProfit: number;
  /** quantity × consumerPrice — what members collect in total. */
  totalConsumerValue: number;
  profitPerParticipant: number;
  pricing: PricingBreakdown;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrder({
  product,
  campaignPricing,
  volumeTiers,
  quantity,
  participants,
}: OrderCalculationInput): OrderCalculation {
  const safeQuantity = Math.max(0, Math.floor(quantity));
  const safeParticipants = Math.max(0, Math.floor(participants));

  // Volume decides the tier, so pricing is resolved after the quantity is known.
  const pricing = resolveProductPricing({
    product,
    campaignPricing,
    volumeTiers,
    quantity: safeQuantity,
  });

  const lineTotal = round2(safeQuantity * pricing.organizationPrice);
  const { net, vat, gross } = splitVat(lineTotal, pricing.vatRate);
  const organizationProfit = round2(safeQuantity * pricing.organizationMargin);

  return {
    quantity: safeQuantity,
    participants: safeParticipants,
    productsPerParticipant: calculateProductsPerParticipant(
      safeQuantity,
      safeParticipants,
    ),
    unitPrice: pricing.organizationPrice,
    consumerPrice: pricing.consumerPrice,
    organizationMargin: pricing.organizationMargin,
    lineTotal,
    subtotal: net,
    vat,
    total: gross,
    organizationProfit,
    totalConsumerValue: round2(safeQuantity * pricing.consumerPrice),
    profitPerParticipant:
      safeParticipants > 0 ? Math.round(organizationProfit / safeParticipants) : 0,
    pricing,
  };
}
