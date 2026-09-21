import type {
  Campaign,
  CampaignPricing,
  Organization,
  PricingTier,
  Product,
} from "@/types";

/**
 * DEMO DATA — local development fixtures.
 *
 * The app runs fully without a database: when Supabase is not configured the
 * repositories in `src/lib/repositories` read from here instead. These
 * fixtures mirror `supabase/migrations/0003_seed_demo.sql` row for row, so a
 * campaign link behaves identically with or without a database.
 *
 * To go live: run the migrations, put real rows in the database, and delete
 * this directory. Nothing outside `src/lib/repositories` imports it.
 */

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export const DEMO_PRODUCT_ID = "11111111-1111-4111-8111-000000000001";

export const DEMO_PRODUCTS: Product[] = [
  {
    id: DEMO_PRODUCT_ID,
    name: "Håndsåpe Refill",
    sku: "SOR-HANDSAPE-500",
    description:
      "Mild håndsåpe på refillflaske. Fyller opp dispenseren i stedet for at den byttes ut.",
    sizeMl: 500,
    consumerPrice: 200,
    defaultPartnerPrice: 120,
    vatRate: 0.25,
    active: true,
    tagline: "Påfyll til dispenseren du allerede har.",
    placeholderTone: "sand",
    sortOrder: 0,
  },
];

/* -------------------------------------------------------------------------- */
/* Organizations                                                               */
/* -------------------------------------------------------------------------- */

export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: "22222222-2222-4222-8222-000000000001",
    name: "Søgne FK",
    slug: "sogne-fk",
    city: "Søgne",
    status: "active",
    contactName: "Demo Kontakt",
    email: "demo+sogne-fk@sorkyst.no",
  },
  {
    id: "22222222-2222-4222-8222-000000000002",
    name: "Søgne Håndball",
    slug: "sogne-handball",
    city: "Søgne",
    status: "active",
    contactName: "Demo Kontakt",
    email: "demo+sogne-handball@sorkyst.no",
  },
  {
    id: "22222222-2222-4222-8222-000000000003",
    name: "Randesund FK",
    slug: "randesund-fk",
    city: "Kristiansand",
    status: "active",
    contactName: "Demo Kontakt",
    email: "demo+randesund-fk@sorkyst.no",
  },
];

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "33333333-3333-4333-8333-000000000001",
    organizationId: "22222222-2222-4222-8222-000000000001",
    name: "Vårdugnad 2026",
    slug: "sogne-fk",
    participants: 600,
    targetProfit: 500_000,
    status: "active",
    startDate: "2026-09-01",
    orderDeadline: "2026-09-21",
    deliveryDate: "2026-10-05",
  },
  {
    id: "33333333-3333-4333-8333-000000000002",
    organizationId: "22222222-2222-4222-8222-000000000002",
    name: "Høstdugnad 2026",
    slug: "sogne-handball",
    participants: 500,
    targetProfit: 250_000,
    status: "active",
    startDate: "2026-09-15",
    orderDeadline: "2026-10-05",
    deliveryDate: "2026-10-19",
  },
  {
    id: "33333333-3333-4333-8333-000000000003",
    organizationId: "22222222-2222-4222-8222-000000000003",
    name: "Sesongdugnad 2026",
    slug: "randesund-fk",
    participants: 900,
    targetProfit: null,
    status: "active",
    startDate: "2026-09-01",
    orderDeadline: "2026-09-28",
    deliveryDate: "2026-10-12",
  },
];

/* -------------------------------------------------------------------------- */
/* Agreed pricing                                                              */
/* -------------------------------------------------------------------------- */

/** Every demo campaign runs on the standard agreement: 200 kr out, 120 kr in. */
export const DEMO_CAMPAIGN_PRICING: CampaignPricing[] = DEMO_CAMPAIGNS.map(
  (campaign, index) => ({
    id: `44444444-4444-4444-8444-00000000000${index + 1}`,
    campaignId: campaign.id,
    productId: DEMO_PRODUCT_ID,
    partnerPrice: 120,
    consumerPrice: 200,
    organizationMargin: 80,
  }),
);

/**
 * No volume tiers are configured. The architecture supports them (see
 * `volume_pricing` in the schema); until a tier exists the agreed campaign
 * price applies unchanged, and the UI shows no discount.
 */
export const DEMO_VOLUME_TIERS: Record<string, PricingTier[]> = {};
