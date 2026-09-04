import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { calculateOrderFinancials } from "@/lib/finance";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import { toE164, type CheckoutInput } from "@/lib/validation";
import { brand } from "@/brand/brand.config";
import { getPublicSellerPage } from "./public";
import { sendOrderReceipts } from "./notifications";

export interface CheckoutResult {
  orderId: string;
  redirectUrl: string;
}

export type CheckoutErrorCode = "NOT_FOUND" | "CAMPAIGN_CLOSED" | "SELLER_INACTIVE" | "PAYMENT_FAILED" | "INVALID";

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code: CheckoutErrorCode,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

const MESSAGES: Record<string, [string, CheckoutErrorCode]> = {
  NOT_FOUND: ["Fant ikke selgeren", "NOT_FOUND"],
  SELLER_INACTIVE: ["Denne selgeren er ikke aktiv", "SELLER_INACTIVE"],
  CAMPAIGN_CLOSED: ["Dugnaden er avsluttet", "CAMPAIGN_CLOSED"],
  INVALID_QUANTITY: ["Ugyldig antall", "INVALID"],
  INVALID_NAME: ["Oppgi navnet ditt", "INVALID"],
};

interface CreateOrderResponse {
  orderId?: string;
  grossAmount?: number;
  error?: string;
}

/**
 * Creates a pending order and hands the customer over to the payment provider.
 *
 * The order is written by the `public_create_order` database function, which
 * computes every amount from the campaign's own pricing — the browser cannot
 * influence what anything costs. `lib/finance.ts` stays the authority for all
 * display and aggregation, and the two are pinned to the same rules by the
 * unit tests plus the assertion below.
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const supabase = await createServerSupabase();
  const provider = getPaymentProvider();
  const phone = toE164(input.customerPhone);

  const page = await getPublicSellerPage(input.clubSlug, input.teamSlug, input.sellerSlug);
  if (!page) throw new CheckoutError("Fant ikke selgeren", "NOT_FOUND");

  const { data, error } = await supabase.rpc("public_create_order", {
    p_club: input.clubSlug,
    p_team: input.teamSlug,
    p_seller: input.sellerSlug,
    p_quantity: input.quantity,
    p_customer_name: input.customerName,
    p_customer_phone: phone,
    p_customer_email: input.customerEmail ?? null,
    p_provider: provider.name,
  });

  if (error) throw new CheckoutError(error.message, "PAYMENT_FAILED");

  const result = (data ?? {}) as CreateOrderResponse;
  if (result.error) {
    const [message, code] = MESSAGES[result.error] ?? ["Noe gikk galt", "PAYMENT_FAILED"];
    throw new CheckoutError(message, code);
  }
  if (!result.orderId) throw new CheckoutError("Kunne ikke opprette ordre", "PAYMENT_FAILED");

  // The database is the authority for the amount charged; this asserts that the
  // TypeScript money rules still agree with it.
  const expected = calculateOrderFinancials(input.quantity, {
    retailPriceIncVat: page.campaign.retail_price_inc_vat,
    clubEarningPerUnit: page.campaign.club_earning_per_unit,
    vatRateBp: page.campaign.vat_rate_bp,
  });
  if (result.grossAmount !== expected.grossAmount) {
    await supabase.rpc("public_fail_order", { p_order_id: result.orderId });
    throw new CheckoutError("Beløpet stemmer ikke. Prøv igjen.", "PAYMENT_FAILED");
  }

  // Invoice campaigns collect no money online: the order is confirmed straight
  // away, counts toward the seller's total and the pickup requirement, and the
  // club is invoiced afterwards.
  if (page.campaign.payment_mode === "INVOICE") {
    const { data: confirmed, error: confirmError } = await supabase.rpc("public_confirm_invoice_order", {
      p_order_id: result.orderId,
    });
    const outcome = (confirmed ?? {}) as { error?: string };
    if (confirmError || outcome.error) {
      await supabase.rpc("public_fail_order", { p_order_id: result.orderId });
      throw new CheckoutError("Kunne ikke registrere bestillingen", "PAYMENT_FAILED");
    }

    await sendOrderReceipts(result.orderId);
    return { orderId: result.orderId, redirectUrl: `${env.appUrl}/order/${result.orderId}/success` };
  }

  const returnUrl = `${env.appUrl}/api/payments/${provider.name}/callback?orderId=${result.orderId}`;

  try {
    const payment = await provider.createPayment({
      orderId: result.orderId,
      amountOre: expected.grossAmount,
      currency: "NOK",
      description: `${brand.product.shortName} × ${input.quantity} — ${page.team.name}`,
      customerPhone: phone,
      returnUrl,
    });

    await supabase.rpc("public_register_payment", {
      p_order_id: result.orderId,
      p_provider: provider.name,
      p_provider_payment_id: payment.providerPaymentId,
      p_status: payment.status,
      p_raw: payment.raw as never,
    });

    return { orderId: result.orderId, redirectUrl: payment.redirectUrl };
  } catch (cause) {
    await supabase.rpc("public_fail_order", { p_order_id: result.orderId });
    throw new CheckoutError(cause instanceof Error ? cause.message : "Betaling feilet", "PAYMENT_FAILED");
  }
}
