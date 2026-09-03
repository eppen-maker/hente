/**
 * Central brand configuration.
 * Swap logo, imagery, product copy and pricing defaults here — nothing else
 * in the application should hardcode brand strings or asset paths.
 */
export const brand = {
  name: "SØRKYST",
  established: "EST. 2026",
  tagline: "Nordisk håndsåpe. Lokal dugnad.",
  domain: "sorkyst.no",
  supportEmail: "hei@sorkyst.no",

  /** Text logo placeholder. Replace `logoSrc` with a real asset when available. */
  logoSrc: null as string | null,
  logoAlt: "SØRKYST",

  product: {
    name: "SØRKYST Hand Wash Refill",
    shortName: "Håndsåpe refill",
    volume: "500 ml",
    imageSrc: null as string | null,
    description:
      "Refillpose med mild, parfymefri håndsåpe. 500 ml fyller flasken din tre ganger og kutter plastforbruket med opptil 80 %.",
    bullets: [
      "500 ml — fyller en 250 ml pumpeflaske tre ganger",
      "Mild og parfymefri, laget i Norge",
      "80 % mindre plast enn en ny flaske",
    ],
  },

  /** Campaign defaults, in øre. Overridable per campaign in the database. */
  defaults: {
    retailPriceIncVatOre: 19_900,
    clubEarningPerUnitOre: 8_000,
    vatRateBp: 2_500,
  },
} as const;

export type Brand = typeof brand;
