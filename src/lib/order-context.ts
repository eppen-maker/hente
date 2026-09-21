import "server-only";

import type { OrderContext } from "@/components/order/context";
import {
  CALCULATOR_DEFAULTS,
  MAX_ORDER_QUANTITY,
  MIN_ORDER_QUANTITY,
} from "@/lib/config/pricing";
import { getDefaultProduct, toPublicProduct } from "@/lib/repositories/catalog";
import type { CampaignWithPricing } from "@/types";

/**
 * Builds the client-safe context for the order flow.
 *
 * Only published figures cross to the browser. The server reloads all of it
 * on submit, so nothing here is trusted when the order is written.
 */
export async function buildOrderContext(
  data: CampaignWithPricing | null,
): Promise<OrderContext> {
  const product = data?.product ?? (await getDefaultProduct());

  return {
    // Strips landedCostExVat: this object is serialised into the browser.
    product: toPublicProduct(product),
    campaignPricing: data?.pricing ?? null,
    volumeTiers: data?.volumeTiers ?? [],
    campaign: data
      ? {
          slug: data.campaign.slug,
          name: data.campaign.name,
          organizationName: data.organization.name,
          organizationCity: data.organization.city ?? null,
          participants: data.campaign.participants,
          targetProfit: data.campaign.targetProfit ?? null,
          orderDeadline: data.campaign.orderDeadline ?? null,
          deliveryDate: data.campaign.deliveryDate ?? null,
        }
      : null,
    minQuantity: MIN_ORDER_QUANTITY,
    maxQuantity: MAX_ORDER_QUANTITY,
    quickVolumes: [...CALCULATOR_DEFAULTS.quickVolumes],
  };
}

export interface OrderPrefill {
  quantity?: number;
  participants?: number;
}

/**
 * Reads the numbers the calculator passes along. Values are hints for the
 * form only — the server still validates and recalculates everything.
 */
export function readOrderPrefill(
  searchParams: Record<string, string | string[] | undefined>,
): OrderPrefill {
  const read = (key: string): number | undefined => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
  };

  return { quantity: read("antall"), participants: read("deltakere") };
}
