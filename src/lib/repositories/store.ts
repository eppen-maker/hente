import "server-only";

import {
  DEMO_CAMPAIGNS,
  DEMO_CAMPAIGN_PRICING,
  DEMO_ORGANIZATIONS,
  DEMO_PRODUCTS,
} from "@/lib/data/demo";
import type {
  Campaign,
  CampaignPricing,
  Delivery,
  ActivityEntry,
  Organization,
  OrganizationPricing,
  PricingTier,
  Product,
} from "@/types";

import { readCollection, updateCollection } from "./local-store";

/**
 * The local database.
 *
 * When Supabase is not configured the whole platform — public site and admin
 * alike — runs on these JSON collections under `.data/`. Each is seeded from
 * the demo fixtures the first time it is read, so an admin edit made locally
 * shows up on the public campaign pages immediately, exactly as a database
 * write would.
 *
 * Delete `.data/` to reset to the demo fixtures.
 */

export interface VolumeTierRow extends PricingTier {
  id: string;
  productId: string;
  campaignId: string | null;
}

interface CollectionSeeds {
  products: Product[];
  organizations: Organization[];
  campaigns: Campaign[];
  "campaign-pricing": CampaignPricing[];
  "organization-pricing": OrganizationPricing[];
  "volume-pricing": VolumeTierRow[];
  deliveries: Delivery[];
  activity: ActivityEntry[];
}

export type CollectionName = keyof CollectionSeeds;

const SEEDS: { [K in CollectionName]: CollectionSeeds[K] } = {
  products: DEMO_PRODUCTS,
  organizations: DEMO_ORGANIZATIONS,
  campaigns: DEMO_CAMPAIGNS,
  "campaign-pricing": DEMO_CAMPAIGN_PRICING,
  // No organization-level or volume pricing is seeded: the demo clubs run on
  // the standard agreement, and no invented discounts reach the UI.
  "organization-pricing": [],
  "volume-pricing": [],
  deliveries: [],
  activity: [],
};

/** True once a collection file exists, so seeding happens exactly once. */
const seeded = new Set<CollectionName>();

/**
 * Reads a collection, writing the demo fixtures on first access.
 * Empty seeds are not written — an empty file and no file mean the same thing.
 */
export async function readSeeded<K extends CollectionName>(
  name: K,
): Promise<CollectionSeeds[K]> {
  const rows = await readCollection<CollectionSeeds[K][number]>(name);
  if (rows.length > 0 || seeded.has(name)) return rows as CollectionSeeds[K];

  const seed = SEEDS[name];
  if (seed.length === 0) {
    seeded.add(name);
    return [] as unknown as CollectionSeeds[K];
  }

  return updateCollection<CollectionSeeds[K][number], CollectionSeeds[K]>(
    name,
    (current) => {
      // Another request may have seeded it while this one waited its turn.
      const next = current.length > 0 ? current : [...seed];
      seeded.add(name);
      return { rows: next, result: next as CollectionSeeds[K] };
    },
  );
}

/** Serialised read-modify-write against a seeded collection. */
export async function mutateSeeded<K extends CollectionName, R>(
  name: K,
  mutate: (rows: CollectionSeeds[K]) => {
    rows: CollectionSeeds[K];
    result: R;
  },
): Promise<R> {
  await readSeeded(name);
  return updateCollection<CollectionSeeds[K][number], R>(name, (current) => {
    const seed = SEEDS[name];
    const rows = (current.length > 0 ? current : [...seed]) as CollectionSeeds[K];
    return mutate(rows) as { rows: CollectionSeeds[K][number][]; result: R };
  });
}
