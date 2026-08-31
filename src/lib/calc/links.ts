import type { CampaignProjection } from "@/types";

/**
 * Carries the calculator's numbers into the order flow, so the club sees the
 * same figures on the next screen and does not retype anything.
 */
export function buildStartCampaignHref(projection: CampaignProjection): string {
  const params = new URLSearchParams({
    deltakere: String(projection.participants),
    antall: String(projection.totalProducts),
  });
  return `/bestill?${params.toString()}`;
}

/** The softer path, for clubs that want to ask before they order. */
export function buildEnquiryHref(projection: CampaignProjection): string {
  const params = new URLSearchParams({
    deltakere: String(projection.participants),
    perDeltaker: String(projection.productsPerParticipant),
    produkter: String(projection.totalProducts),
    fortjeneste: String(projection.organizationProfit),
  });
  if (projection.profitGoal) params.set("mal", String(projection.profitGoal));
  return `/start-dugnad?${params.toString()}`;
}
