import type { FundraisingCampaign, Organization } from "@/types";
import { DEFAULT_PRICING_ID } from "@/lib/config/pricing";

/** Seeded demo organizations — stand-ins until the CRM stores real ones. */
export const ORGANIZATIONS: Organization[] = [
  {
    id: "org-kristiansand-fk",
    slug: "kristiansand-fk",
    name: "Kristiansand FK",
    type: "sports-club",
    organizationNumber: "912345678",
    city: "Kristiansand",
    participantCount: 600,
    contact: {
      name: "Ingrid Solheim",
      email: "ingrid@kristiansandfk.no",
      role: "Dugnadsansvarlig",
    },
    pricingId: DEFAULT_PRICING_ID,
    createdAt: "2026-01-14T09:00:00.000Z",
  },
  {
    id: "org-mandal-handball",
    slug: "mandal-handball",
    name: "Mandal Håndball",
    type: "team",
    city: "Mandal",
    participantCount: 180,
    contact: { name: "Petter Aas", email: "petter@mandalhandball.no" },
    createdAt: "2026-02-02T09:00:00.000Z",
  },
  {
    id: "org-arendal-skolekorps",
    slug: "arendal-skolekorps",
    name: "Arendal Skolekorps",
    type: "corps",
    city: "Arendal",
    participantCount: 95,
    contact: { name: "Marte Nyland", email: "marte@arendalkorps.no" },
    createdAt: "2026-02-20T09:00:00.000Z",
  },
];

export const CAMPAIGNS: FundraisingCampaign[] = [
  {
    id: "camp-kfk-var-2026",
    organizationId: "org-kristiansand-fk",
    name: "Vårdugnad 2026",
    status: "active",
    goalMode: "profit-goal",
    participantCount: 600,
    profitGoal: 500_000,
    productsPerParticipant: 11,
    plannedProducts: 6_600,
    pricingId: DEFAULT_PRICING_ID,
    startsAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2026-04-15T00:00:00.000Z",
    createdAt: "2026-01-20T09:00:00.000Z",
  },
];

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return ORGANIZATIONS.find((organization) => organization.slug === slug);
}
