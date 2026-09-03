import { z } from "zod";

/** Norwegian mobile number, tolerant of spaces and +47 prefixes. */
export const norwegianPhone = z
  .string()
  .trim()
  .min(8, "Oppgi et gyldig mobilnummer")
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?47)?[2-9]\d{7}$/.test(v), "Oppgi et gyldig norsk mobilnummer");

/** Store phone numbers in E.164 without the plus, which is what Vipps expects. */
export function toE164(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("47") && digits.length === 10 ? digits : `47${digits}`;
}

export const checkoutSchema = z.object({
  clubSlug: z.string().min(1),
  teamSlug: z.string().min(1),
  sellerSlug: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Velg minst 1 pose").max(200, "Maks 200 poser per bestilling"),
  customerName: z.string().trim().min(2, "Oppgi navn").max(120),
  customerPhone: norwegianPhone,
  customerEmail: z.union([z.string().trim().email("Ugyldig e-postadresse"), z.literal("")]).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const clubSchema = z.object({
  name: z.string().trim().min(2, "Navn er påkrevd"),
  slug: z.string().trim().optional(),
  organisationNumber: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
  contactPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  active: z.coerce.boolean().optional(),
});

export const teamSchema = z.object({
  clubId: z.string().uuid(),
  name: z.string().trim().min(1, "Navn er påkrevd"),
  season: z.string().trim().optional(),
});

export const campaignSchema = z.object({
  clubId: z.string().uuid(),
  name: z.string().trim().min(2, "Navn er påkrevd"),
  description: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  salesTargetQuantity: z.coerce.number().int().min(0).default(0),
  /** Kroner in the form, converted to øre before it touches the database. */
  retailPriceKr: z.coerce.number().min(1).default(199),
  clubEarningKr: z.coerce.number().min(0).default(80),
  vatRatePercent: z.coerce.number().min(0).max(100).default(25),
  pickupLocation: z.string().trim().optional(),
  pickupDate: z.string().trim().optional(),
  leaderboardEnabled: z.coerce.boolean().default(true),
});

export const sellerSchema = z.object({
  campaignId: z.string().uuid(),
  teamId: z.string().uuid(),
  firstName: z.string().trim().min(1, "Fornavn er påkrevd"),
  lastName: z.string().trim().min(1, "Etternavn er påkrevd"),
  phone: z.string().trim().optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  salesTarget: z.coerce.number().int().min(0).default(0),
});

export const csvImportSchema = z.object({
  csv: z.string().min(1, "Lim inn CSV-innhold"),
});
