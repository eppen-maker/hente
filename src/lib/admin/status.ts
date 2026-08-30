import type {
  CampaignStatus,
  DeliveryStatus,
  OrderStatus,
  OrganizationStatus,
  PricingSource,
} from "@/types";

/**
 * Norwegian labels and badge tones for every status in the CRM.
 * One place, so a badge never disagrees with a filter.
 */

export type StatusTone = "neutral" | "progress" | "positive" | "warning" | "muted";

export interface StatusMeta<T extends string> {
  value: T;
  label: string;
  tone: StatusTone;
}

export const CAMPAIGN_STATUSES: StatusMeta<CampaignStatus>[] = [
  { value: "draft", label: "Utkast", tone: "muted" },
  { value: "planned", label: "Planlegges", tone: "neutral" },
  { value: "active", label: "Åpen", tone: "progress" },
  { value: "ordered", label: "Bestilt", tone: "progress" },
  { value: "in_production", label: "Under produksjon", tone: "progress" },
  { value: "ready_for_delivery", label: "Klar til levering", tone: "progress" },
  { value: "delivered", label: "Levert", tone: "positive" },
  { value: "completed", label: "Fullført", tone: "positive" },
  { value: "cancelled", label: "Kansellert", tone: "warning" },
];

export const ORDER_STATUSES: StatusMeta<OrderStatus>[] = [
  { value: "received", label: "Mottatt", tone: "neutral" },
  { value: "confirmed", label: "Bekreftet", tone: "progress" },
  { value: "in_production", label: "Produksjon", tone: "progress" },
  { value: "packed", label: "Pakket", tone: "progress" },
  { value: "shipped", label: "Sendt", tone: "progress" },
  { value: "delivered", label: "Levert", tone: "positive" },
  { value: "invoiced", label: "Fakturert", tone: "positive" },
  { value: "cancelled", label: "Kansellert", tone: "warning" },
];

export const DELIVERY_STATUSES: StatusMeta<DeliveryStatus>[] = [
  { value: "not_planned", label: "Ikke planlagt", tone: "muted" },
  { value: "planned", label: "Planlagt", tone: "neutral" },
  { value: "in_transit", label: "Under transport", tone: "progress" },
  { value: "delivered", label: "Levert", tone: "positive" },
];

export const ORGANIZATION_STATUSES: StatusMeta<OrganizationStatus>[] = [
  { value: "lead", label: "Lead", tone: "neutral" },
  { value: "active", label: "Aktiv", tone: "positive" },
  { value: "inactive", label: "Inaktiv", tone: "muted" },
];

export const PRICING_SOURCE_LABELS: Record<PricingSource, string> = {
  campaign: "Dugnadspris",
  organization: "Organisasjonspris",
  volume: "Volumtrinn",
  "product-default": "Standardpris",
};

function lookup<T extends string>(list: StatusMeta<T>[], value: T): StatusMeta<T> {
  return list.find((item) => item.value === value) ?? { value, label: value, tone: "neutral" };
}

export const campaignStatus = (value: CampaignStatus) => lookup(CAMPAIGN_STATUSES, value);
export const orderStatus = (value: OrderStatus) => lookup(ORDER_STATUSES, value);
export const deliveryStatus = (value: DeliveryStatus) => lookup(DELIVERY_STATUSES, value);
export const organizationStatus = (value: OrganizationStatus) =>
  lookup(ORGANIZATION_STATUSES, value);

/** Campaign statuses that still accept public orders. */
export const OPEN_CAMPAIGN_STATUSES: CampaignStatus[] = ["planned", "active"];
