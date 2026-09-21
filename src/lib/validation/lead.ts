import type { OrganizationType } from "@/types";
import type { NewCampaignLead } from "@/lib/repositories/leads";

const ORGANIZATION_TYPES: OrganizationType[] = [
  "sports-club",
  "team",
  "association",
  "school",
  "corps",
  "other",
];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  "sports-club": "Idrettslag",
  team: "Lag eller gruppe",
  association: "Forening",
  school: "Skole eller FAU",
  corps: "Korps",
  other: "Annet",
};

export type LeadFieldErrors = Partial<Record<keyof NewCampaignLead, string>>;

export interface LeadValidationResult {
  ok: boolean;
  data?: NewCampaignLead;
  errors: LeadFieldErrors;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[\s ]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validates an untrusted payload from the public enquiry form. */
export function validateLead(payload: unknown): LeadValidationResult {
  const errors: LeadFieldErrors = {};
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;

  const organizationName = str(body.organizationName);
  const contactName = str(body.contactName);
  const email = str(body.email);
  const participantCount = num(body.participantCount) ?? 0;

  if (organizationName.length < 2) errors.organizationName = "Skriv inn navnet på organisasjonen.";
  if (contactName.length < 2) errors.contactName = "Skriv inn navnet ditt.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Skriv inn en gyldig e-postadresse.";
  if (participantCount < 1) errors.participantCount = "Antall deltakere må være minst 1.";

  const rawType = str(body.organizationType) as OrganizationType;
  const organizationType: OrganizationType = ORGANIZATION_TYPES.includes(rawType)
    ? rawType
    : "sports-club";

  const rawSource = str(body.source);
  const source: NewCampaignLead["source"] =
    rawSource === "calculator" || rawSource === "homepage" || rawSource === "contact"
      ? rawSource
      : "unknown";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    data: {
      organizationName,
      organizationType,
      contactName,
      email,
      phone: str(body.phone) || undefined,
      city: str(body.city) || undefined,
      participantCount: Math.round(participantCount),
      productsPerParticipant: num(body.productsPerParticipant),
      profitGoal: num(body.profitGoal),
      estimatedProducts: num(body.estimatedProducts),
      estimatedProfit: num(body.estimatedProfit),
      message: str(body.message) || undefined,
      source,
    },
  };
}
