/**
 * Fundraising economics. The single source of truth for every money split.
 * All inputs and outputs are integer øre; the VAT rate is basis points.
 */
import { assertOre, divideRound, multiply, type Ore } from "./money";

export interface CampaignPricing {
  /** Retail price per unit, VAT included, in øre. */
  retailPriceIncVat: Ore;
  /** Amount the club keeps per unit, in øre. */
  clubEarningPerUnit: Ore;
  /** VAT rate in basis points, e.g. 2500 = 25 %. */
  vatRateBp: number;
}

export interface FinancialBreakdown {
  quantity: number;
  /** What the customer pays, VAT included. */
  grossAmount: Ore;
  /** What the club earns. */
  clubEarningAmount: Ore;
  /** SØRKYST's share, VAT included. */
  sorkystAmountIncVat: Ore;
  /** VAT contained in SØRKYST's share. */
  vatAmount: Ore;
  /** SØRKYST revenue excluding VAT. */
  sorkystRevenueExVat: Ore;
}

export function validatePricing(pricing: CampaignPricing): void {
  assertOre(pricing.retailPriceIncVat, "retailPriceIncVat");
  assertOre(pricing.clubEarningPerUnit, "clubEarningPerUnit");
  if (pricing.retailPriceIncVat <= 0) throw new Error("retail price must be positive");
  if (pricing.clubEarningPerUnit < 0) throw new Error("club earning cannot be negative");
  if (pricing.clubEarningPerUnit > pricing.retailPriceIncVat) {
    throw new Error("club earning cannot exceed the retail price");
  }
  if (!Number.isInteger(pricing.vatRateBp) || pricing.vatRateBp < 0 || pricing.vatRateBp > 10_000) {
    throw new Error("vatRateBp must be an integer between 0 and 10000");
  }
}

/**
 * Extract the VAT contained in a VAT-inclusive amount.
 * 119 000 NOK at 25 % -> 23 800 NOK.
 */
export function vatFromGross(amountIncVat: Ore, vatRateBp: number): Ore {
  assertOre(amountIncVat, "amountIncVat");
  return divideRound(amountIncVat * vatRateBp, 10_000 + vatRateBp);
}

/** VAT added on top of a VAT-exclusive amount. */
export function vatFromNet(amountExVat: Ore, vatRateBp: number): Ore {
  assertOre(amountExVat, "amountExVat");
  return divideRound(amountExVat * vatRateBp, 10_000);
}

/** Full breakdown for a quantity of units sold under a campaign's pricing. */
export function calculateOrderFinancials(quantity: number, pricing: CampaignPricing): FinancialBreakdown {
  validatePricing(pricing);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("quantity must be a positive integer");

  const grossAmount = multiply(pricing.retailPriceIncVat, quantity);
  const clubEarningAmount = multiply(pricing.clubEarningPerUnit, quantity);
  const sorkystAmountIncVat = grossAmount - clubEarningAmount;
  const vatAmount = vatFromGross(sorkystAmountIncVat, pricing.vatRateBp);
  const sorkystRevenueExVat = sorkystAmountIncVat - vatAmount;

  return { quantity, grossAmount, clubEarningAmount, sorkystAmountIncVat, vatAmount, sorkystRevenueExVat };
}

export const emptyBreakdown: FinancialBreakdown = {
  quantity: 0,
  grossAmount: 0,
  clubEarningAmount: 0,
  sorkystAmountIncVat: 0,
  vatAmount: 0,
  sorkystRevenueExVat: 0,
};

/** Sum a set of per-order breakdowns (used for seller, team, campaign totals). */
export function sumBreakdowns(items: FinancialBreakdown[]): FinancialBreakdown {
  return items.reduce<FinancialBreakdown>(
    (acc, item) => ({
      quantity: acc.quantity + item.quantity,
      grossAmount: acc.grossAmount + item.grossAmount,
      clubEarningAmount: acc.clubEarningAmount + item.clubEarningAmount,
      sorkystAmountIncVat: acc.sorkystAmountIncVat + item.sorkystAmountIncVat,
      vatAmount: acc.vatAmount + item.vatAmount,
      sorkystRevenueExVat: acc.sorkystRevenueExVat + item.sorkystRevenueExVat,
    }),
    { ...emptyBreakdown },
  );
}

export interface OrderLike {
  quantity: number;
  gross_amount: number;
  club_earning_amount: number;
  sorkyst_amount_inc_vat: number;
  vat_amount: number;
  sorkyst_revenue_ex_vat: number;
}

/** Aggregate persisted order rows into a breakdown, without recomputing them. */
export function aggregateOrders(orders: OrderLike[]): FinancialBreakdown {
  return sumBreakdowns(
    orders.map((o) => ({
      quantity: o.quantity,
      grossAmount: o.gross_amount,
      clubEarningAmount: o.club_earning_amount,
      sorkystAmountIncVat: o.sorkyst_amount_inc_vat,
      vatAmount: o.vat_amount,
      sorkystRevenueExVat: o.sorkyst_revenue_ex_vat,
    })),
  );
}

/** Progress toward a target, clamped to 0–100 for display. */
export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
