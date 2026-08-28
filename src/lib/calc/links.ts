import type { CampaignProjection } from "@/types";

/**
 * Carries the calculator's numbers into the enquiry form, so the club sees
 * the same figures on the next screen and sales gets them with the lead.
 */
export function buildStartCampaignHref(projection: CampaignProjection): string {
  const params = new URLSearchParams({
    deltakere: String(projection.participants),
    perDeltaker: String(projection.productsPerParticipant),
    produkter: String(projection.totalProducts),
    fortjeneste: String(projection.organizationProfit),
  });
  if (projection.profitGoal) params.set("mal", String(projection.profitGoal));
  return `/start-dugnad?${params.toString()}`;
}
