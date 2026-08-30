import { DEFAULT_PRICING_ID } from "@/lib/config/pricing";
import type { CatalogueProduct } from "@/types";

/**
 * Editorial product catalogue for the marketing pages.
 *
 * This is copy and imagery, not order economics: the orderable products and
 * their prices live in the `products` table (see src/lib/data/demo/catalog.ts
 * for the local fallback).
 */
export const CATALOGUE: CatalogueProduct[] = [
  {
    id: "prod-refill-handsape",
    slug: "handsape-refill",
    name: "Håndsåpe Refill",
    tagline: "Én liter. Fem påfyll.",
    description:
      "Mild, parfymelett håndsåpe på refillflaske. Erstatter fem engangsflasker og holder i månedsvis på et vanlig bad.",
    category: "refill",
    pricingId: DEFAULT_PRICING_ID,
    variants: [
      { id: "var-hs-1000-nordlys", name: "Nordlys", size: "1 000 ml", scent: "Einer og salt" },
      { id: "var-hs-1000-drivved", name: "Drivved", size: "1 000 ml", scent: "Sedertre" },
    ],
    ingredientsHighlight: ["98 % naturlig opphav", "Uten mikroplast", "Laget i Norden"],
    placeholderTone: "sand",
    isActive: true,
  },
  {
    id: "prod-refill-oppvask",
    slug: "oppvask-refill",
    name: "Oppvask Refill",
    tagline: "Konsentrert. Effektiv. Diskré duft.",
    description:
      "Konsentrert oppvaskmiddel som skjærer gjennom fett uten å tørke ut hendene. Refillflasken holder til fem påfyll.",
    category: "refill",
    pricingId: DEFAULT_PRICING_ID,
    variants: [{ id: "var-op-1000-sitrus", name: "Sitrus", size: "1 000 ml", scent: "Sitron og timian" }],
    ingredientsHighlight: ["Konsentrat", "Biologisk nedbrytbar", "Resirkulert plast"],
    placeholderTone: "sage",
    isActive: true,
  },
  {
    id: "prod-refill-tekstil",
    slug: "tekstilvask-refill",
    name: "Tekstilvask Refill",
    tagline: "Til hverdagsvasken som aldri tar slutt.",
    description:
      "Skånsomt vaskemiddel for farget og hvitt tøy. Doserer lavt, vasker rent på 30 grader.",
    category: "refill",
    pricingId: DEFAULT_PRICING_ID,
    variants: [{ id: "var-tv-1000-hvit", name: "Ren", size: "1 000 ml", scent: "Nøytral" }],
    ingredientsHighlight: ["Virker på 30 °C", "Allergivennlig", "Uten optisk hvitt"],
    placeholderTone: "stone",
    isActive: true,
  },
  {
    id: "prod-kit-start",
    slug: "startsett",
    name: "Startsett",
    tagline: "Pumpeflaske i glass og første refill.",
    description:
      "Tung glassflaske med pumpe i børstet metall, levert med én refill. Settet folk beholder på benken.",
    category: "starter-kit",
    pricingId: DEFAULT_PRICING_ID,
    variants: [{ id: "var-kit-glass", name: "Glass og metall", size: "300 ml + 1 000 ml" }],
    ingredientsHighlight: ["Glass og metall", "Etterfyllbar", "Designet i Norge"],
    placeholderTone: "clay",
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
