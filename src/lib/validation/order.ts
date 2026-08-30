import { z } from "zod";

import { MAX_ORDER_QUANTITY, MIN_ORDER_QUANTITY } from "@/lib/config/pricing";

/**
 * Validation for the public order flow.
 *
 * Note what is NOT here: prices, margins and totals. Zod strips unknown keys,
 * so a client cannot smuggle its own pricing into an order — every amount is
 * recalculated on the server from the database.
 */

const trimmed = z.string().trim();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const goalModeSchema = z.enum([
  "per-participant",
  "profit-goal",
  "total-volume",
]);

export const orderInputSchema = z.object({
  /** Present when the order came from a campaign link. */
  campaignSlug: trimmed.min(1).max(120).optional(),

  organizationName: trimmed
    .min(2, "Skriv inn navnet på organisasjonen.")
    .max(160),
  organizationNumber: trimmed
    .regex(/^\d{9}$/, "Organisasjonsnummer må være 9 siffer.")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  contactName: trimmed.min(2, "Skriv inn navnet ditt.").max(160),
  email: trimmed
    .max(254)
    .refine((value) => EMAIL_PATTERN.test(value), "Skriv inn en gyldig e-postadresse."),
  phone: trimmed.max(40).optional().or(z.literal("").transform(() => undefined)),

  participants: z
    .number({ error: "Antall deltakere må være et tall." })
    .int("Antall deltakere må være et helt tall.")
    .min(1, "Antall deltakere må være minst 1.")
    .max(50_000, "Ta kontakt med oss for dugnader av denne størrelsen."),

  quantity: z
    .number({ error: "Antall produkter må være et tall." })
    .int("Antall produkter må være et helt tall.")
    .min(
      MIN_ORDER_QUANTITY,
      `Minste bestilling er ${MIN_ORDER_QUANTITY} produkter.`,
    )
    .max(
      MAX_ORDER_QUANTITY,
      "Ta kontakt med oss for bestillinger av denne størrelsen.",
    ),

  /** How the club planned the volume. Recorded for context, never for pricing. */
  goalMode: goalModeSchema.default("per-participant"),
  targetProfit: z.number().min(0).max(100_000_000).optional(),

  address: trimmed.max(200).optional().or(z.literal("").transform(() => undefined)),
  postalCode: trimmed
    .regex(/^\d{4}$/, "Postnummer må være 4 siffer.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  city: trimmed.max(120).optional().or(z.literal("").transform(() => undefined)),

  requestedDeliveryDate: trimmed
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig dato.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: trimmed.max(2_000).optional().or(z.literal("").transform(() => undefined)),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export type OrderFieldErrors = Partial<Record<keyof OrderInput, string>>;

export interface OrderValidationResult {
  ok: boolean;
  data?: OrderInput;
  errors: OrderFieldErrors;
}

/** Validates an untrusted payload and flattens errors to one message per field. */
export function validateOrderInput(payload: unknown): OrderValidationResult {
  const parsed = orderInputSchema.safeParse(payload);
  if (parsed.success) return { ok: true, data: parsed.data, errors: {} };

  const errors: OrderFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof OrderInput] = issue.message;
    }
  }
  return { ok: false, errors };
}
