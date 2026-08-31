import type { CampaignPricing, PricingTier, Product } from "@/types";

/**
 * Everything the order flow needs on the client.
 *
 * These are published prices — the same figures the marketing site shows — so
 * the client can render live totals. They are never trusted on submit: the
 * server reloads the campaign and product and recalculates every amount.
 */
export interface OrderContext {
  product: Product;
  campaignPricing: CampaignPricing | null;
  volumeTiers: PricingTier[];
  /** Set when the order came in through a partner link. */
  campaign: OrderCampaignContext | null;
  minQuantity: number;
  maxQuantity: number;
}

export interface OrderCampaignContext {
  slug: string;
  name: string;
  organizationName: string;
  organizationCity: string | null;
  participants: number;
  targetProfit: number | null;
  orderDeadline: string | null;
  deliveryDate: string | null;
}

export interface OrderDraft {
  organizationName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  participants: number;
  goalMode: "per-participant" | "profit-goal" | "total-volume";
  productsPerParticipant: number;
  profitGoal: number;
  quantity: number;
  address: string;
  postalCode: string;
  city: string;
  requestedDeliveryDate: string;
  notes: string;
}

export interface OrderReceipt {
  orderNumber: string;
  summary: {
    quantity: number;
    participants: number;
    productsPerParticipant: number;
    unitPrice: number;
    consumerPrice: number;
    organizationMargin: number;
    subtotal: number;
    vat: number;
    total: number;
    organizationProfit: number;
    totalConsumerValue: number;
    productName: string;
  };
}

export const ORDER_STEPS = [
  { id: 1, label: "Dugnad" },
  { id: 2, label: "Mål" },
  { id: 3, label: "Oppsummering" },
] as const;

export type OrderStepId = (typeof ORDER_STEPS)[number]["id"];
