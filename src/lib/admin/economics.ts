import { splitVat } from "@/lib/config/pricing";
import type {
  InternalEconomics,
  InternalUnitEconomics,
  PricingBreakdown,
  Product,
} from "@/types";

/**
 * Internal SØR° economics — admin only.
 *
 * Deliberately separate from the customer-facing calculations in
 * `src/lib/calc`: those answer "what does the club earn", these answer "what
 * do we earn". Landed cost never leaves this module's callers, and never
 * reaches a public page.
 */

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function unitEconomics(
  product: Pick<Product, "vatRate" | "landedCostExVat">,
  pricing: Pick<PricingBreakdown, "consumerPrice" | "organizationPrice" | "organizationMargin">,
): InternalUnitEconomics {
  const vatRate = product.vatRate;
  const revenueExVat = splitVat(pricing.organizationPrice, vatRate).net;
  const consumerPriceExVat = splitVat(pricing.consumerPrice, vatRate).net;
  const landedCostExVat = product.landedCostExVat ?? null;

  const grossProfitPerUnit =
    landedCostExVat == null ? null : round2(revenueExVat - landedCostExVat);

  return {
    consumerPriceExVat,
    revenueExVat,
    landedCostExVat,
    grossProfitPerUnit,
    grossMargin:
      grossProfitPerUnit == null || revenueExVat <= 0
        ? null
        : grossProfitPerUnit / revenueExVat,
    organizationMargin: pricing.organizationMargin,
  };
}

export interface EconomicsLine {
  quantity: number;
  /** Unit price the organization pays, incl. VAT. */
  unitPrice: number;
  /** Margin the organization keeps per unit. */
  organizationMargin: number;
  vatRate: number;
  landedCostExVat?: number | null;
}

/**
 * Aggregates internal economics over order lines.
 *
 * A line with no configured landed cost contributes revenue but not COGS, and
 * flags the result as incomplete — better than quietly reporting a gross
 * margin that is too high.
 */
export function aggregateEconomics(lines: EconomicsLine[]): InternalEconomics {
  let units = 0;
  let revenueExVat = 0;
  let cogs = 0;
  let organizationProfit = 0;
  let incomplete = false;
  let anyCost = false;

  for (const line of lines) {
    units += line.quantity;
    revenueExVat += splitVat(line.unitPrice * line.quantity, line.vatRate).net;
    organizationProfit += line.organizationMargin * line.quantity;

    if (line.landedCostExVat == null) {
      incomplete = true;
    } else {
      anyCost = true;
      cogs += line.landedCostExVat * line.quantity;
    }
  }

  const roundedRevenue = round2(revenueExVat);
  const roundedCogs = anyCost ? round2(cogs) : null;
  const grossProfit = roundedCogs == null ? null : round2(roundedRevenue - roundedCogs);

  return {
    units,
    revenueExVat: roundedRevenue,
    cogs: roundedCogs,
    grossProfit,
    grossMargin:
      grossProfit == null || roundedRevenue <= 0 ? null : grossProfit / roundedRevenue,
    organizationProfit: round2(organizationProfit),
    incomplete,
  };
}
