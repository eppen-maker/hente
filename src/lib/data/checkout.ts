import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculateOrderFinancials } from "@/lib/finance";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import { toE164, type CheckoutInput } from "@/lib/validation";
import { brand } from "@/brand/brand.config";
import { getPublicSellerPage } from "./public";

export interface CheckoutResult {
  orderId: string;
  redirectUrl: string;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CAMPAIGN_CLOSED" | "SELLER_INACTIVE" | "PAYMENT_FAILED",
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Creates a pending order and hands the customer over to the payment provider.
 * All money is computed once, here, from the campaign's own pricing.
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const page = await getPublicSellerPage(input.clubSlug, input.teamSlug, input.sellerSlug);
  if (!page) throw new CheckoutError("Fant ikke selgeren", "NOT_FOUND");
  if (!page.seller.active) throw new CheckoutError("Denne selgeren er ikke aktiv", "SELLER_INACTIVE");
  if (page.campaign.status !== "ACTIVE") throw new CheckoutError("Dugnaden er avsluttet", "CAMPAIGN_CLOSED");

  const financials = calculateOrderFinancials(input.quantity, {
    retailPriceIncVat: page.campaign.retail_price_inc_vat,
    clubEarningPerUnit: page.campaign.club_earning_per_unit,
    vatRateBp: page.campaign.vat_rate_bp,
  });

  const supabase = createAdminSupabase();
  const provider = getPaymentProvider();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      campaign_id: page.campaign.id,
      club_id: page.club.id,
      team_id: page.team.id,
      seller_id: page.seller.id,
      customer_name: input.customerName,
      customer_email: input.customerEmail || null,
      customer_phone: toE164(input.customerPhone),
      quantity: input.quantity,
      unit_price_inc_vat: page.campaign.retail_price_inc_vat,
      gross_amount: financials.grossAmount,
      club_earning_amount: financials.clubEarningAmount,
      sorkyst_amount_inc_vat: financials.sorkystAmountIncVat,
      vat_amount: financials.vatAmount,
      sorkyst_revenue_ex_vat: financials.sorkystRevenueExVat,
      vat_rate_bp: page.campaign.vat_rate_bp,
      payment_provider: provider.name,
      payment_status: "PENDING",
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error || !order) throw new CheckoutError(error?.message ?? "Kunne ikke opprette ordre", "PAYMENT_FAILED");

  const returnUrl = `${env.appUrl}/api/payments/${provider.name}/callback?orderId=${order.id}`;

  try {
    const payment = await provider.createPayment({
      orderId: order.id,
      amountOre: financials.grossAmount,
      currency: "NOK",
      description: `${brand.product.shortName} × ${input.quantity} — ${page.team.name}`,
      customerPhone: toE164(input.customerPhone),
      returnUrl,
    });

    await supabase.from("payments").insert({
      order_id: order.id,
      provider: provider.name,
      provider_payment_id: payment.providerPaymentId,
      provider_reference: payment.providerReference,
      amount: financials.grossAmount,
      currency: "NOK",
      status: payment.status,
      raw_response: payment.raw as never,
    });

    await supabase.from("orders").update({ payment_reference: payment.providerPaymentId }).eq("id", order.id);

    return { orderId: order.id, redirectUrl: payment.redirectUrl };
  } catch (cause) {
    await supabase
      .from("orders")
      .update({ status: "CANCELLED", payment_status: "FAILED", cancelled_at: new Date().toISOString() })
      .eq("id", order.id);
    throw new CheckoutError(cause instanceof Error ? cause.message : "Betaling feilet", "PAYMENT_FAILED");
  }
}
