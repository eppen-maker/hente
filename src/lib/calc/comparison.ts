import { TRADITIONAL_DUGNAD, resolvePricing } from "@/lib/config/pricing";

/**
 * Compares a traditional dugnad, measured in hours, with the same money earned
 * by selling products.
 *
 * The point is not that selling is free — it is that the same sum costs a very
 * different number of evenings. Every figure is derived, so changing the
 * example in `TRADITIONAL_DUGNAD` or the price list updates the copy.
 */
export interface DugnadComparison {
  participants: number;
  hoursPerParticipant: number;
  totalHours: number;
  totalProfit: number;
  /** What an hour of traditional dugnad is worth to the club. */
  profitPerHour: number;
  /** Products the team must sell to reach the same sum. */
  productsNeeded: number;
  productsPerParticipant: number;
  profitPerProduct: number;
  consumerPrice: number;
  /** A fuller effort: what the same team earns selling more each. */
  ambitiousProductsPerParticipant: number;
  ambitiousProfit: number;
}

export function compareWithTraditionalDugnad(): DugnadComparison {
  const { participants, hoursPerParticipant, totalProfit, ambitiousProductsPerParticipant } =
    TRADITIONAL_DUGNAD;

  const pricing = resolvePricing();
  const totalHours = participants * hoursPerParticipant;
  const productsNeeded = Math.ceil(totalProfit / pricing.organizationMargin);
  const productsPerParticipant = Math.ceil(productsNeeded / participants);

  return {
    participants,
    hoursPerParticipant,
    totalHours,
    totalProfit,
    profitPerHour: totalHours > 0 ? Math.round(totalProfit / totalHours) : 0,
    productsNeeded,
    productsPerParticipant,
    profitPerProduct: pricing.organizationMargin,
    consumerPrice: pricing.consumerPrice,
    ambitiousProductsPerParticipant,
    ambitiousProfit:
      participants * ambitiousProductsPerParticipant * pricing.organizationMargin,
  };
}
