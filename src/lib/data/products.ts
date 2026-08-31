import { DEFAULT_PRICING_ID } from "@/lib/config/pricing";
import type { CatalogueProduct } from "@/types";

/**
 * Editorial product catalogue for the marketing pages.
 *
 * This is copy and imagery, not order economics: the orderable products and
 * their prices live in the `products` table (see `src/lib/data/demo/` for the
 * local fallback).
 *
 * SØRKYST sells one product today. The catalogue is an array, and every page that
 * reads it handles one or many, so a second product is a matter of adding an
 * entry here and a row in `products`.
 */
export const CATALOGUE: CatalogueProduct[] = [
  {
    id: "prod-handsape-refill",
    slug: "handsape-refill",
    name: "Håndsåpe Refill",
    tagline: "Påfyll til dispenseren du allerede har.",
    description:
      "Mild håndsåpe på refillpose. Fyller opp dispenseren i stedet for at den byttes ut.",
    category: "refill",
    pricingId: DEFAULT_PRICING_ID,
    // Ingen varianter eller innholdspåstander er lagt inn — de skal komme fra
    // ekte produktdata, ikke fra plassholdertekst.
    variants: [],
    imageUrl: "/produkter/handsape-refill.webp",
    placeholderTone: "sand",
    isActive: true,
  },
];

export function getCatalogueProductBySlug(
  slug: string,
): CatalogueProduct | undefined {
  return CATALOGUE.find((product) => product.slug === slug);
}

/** Editorial catalogue shown on the marketing pages. */
export function getActiveProducts(): CatalogueProduct[] {
  return CATALOGUE.filter((product) => product.isActive);
}
