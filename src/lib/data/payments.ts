import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { recordAudit } from "./audit";

const ORDER_STATUS_FOR_PAYMENT: Record<PaymentStatus, OrderStatus> = {
  PENDING: "PENDING",
  AUTHORIZED: "PAID",
  CAPTURED: "PAID",
  FAILED: "CANCELLED",
  REFUNDED: "REFUNDED",
};

/**
 * Single place where a payment result is applied to an order.
 * Called by both the redirect callback and the provider webhook, and is
 * idempotent so the two racing is harmless.
 */
export async function applyPaymentResult(args: {
  orderId: string;
  providerName: string;
  providerPaymentId: string;
  status: PaymentStatus;
  raw: unknown;
}): Promise<{ orderId: string; status: OrderStatus } | null> {
  const supabase = createAdminSupabase();

  const { data: order } = await supabase
    .from("orders")
    .select("id, seller_id, status, payment_status, quantity")
    .eq("id", args.orderId)
    .maybeSingle();
  if (!order) return null;

  const orderStatus = ORDER_STATUS_FOR_PAYMENT[args.status];
  const now = new Date().toISOString();

  // Already settled with the same outcome — nothing to do.
  if (order.status === orderStatus && order.payment_status === args.status) {
    return { orderId: order.id, status: orderStatus };
  }
  // Never downgrade a paid order back to pending.
  if (order.status === "PAID" && orderStatus === "PENDING") {
    return { orderId: order.id, status: order.status as OrderStatus };
  }

  await supabase
    .from("orders")
    .update({
      payment_status: args.status,
      status: orderStatus,
      payment_reference: args.providerPaymentId,
      paid_at: orderStatus === "PAID" ? (order.status === "PAID" ? undefined : now) : null,
      cancelled_at: orderStatus === "CANCELLED" ? now : null,
    })
    .eq("id", order.id);

  await supabase
    .from("payments")
    .update({ status: args.status, raw_response: args.raw as never, provider_payment_id: args.providerPaymentId })
    .eq("order_id", order.id);

  // A paid order becomes a delivery obligation for the seller.
  if (orderStatus === "PAID") {
    await supabase
      .from("order_deliveries")
      .upsert({ order_id: order.id, seller_id: order.seller_id, status: "NOT_DELIVERED" }, { onConflict: "order_id" });
  }

  await recordAudit({
    action: `payment.${args.status.toLowerCase()}`,
    entityType: "order",
    entityId: order.id,
    metadata: { provider: args.providerName, providerPaymentId: args.providerPaymentId },
  });

  return { orderId: order.id, status: orderStatus };
}

/**
 * Confirm an order against the provider itself rather than trusting a redirect
 * or an unverified webhook body.
 */
export async function verifyAndSettleOrder(orderId: string, providerName: string, providerPaymentId: string) {
  const provider = getPaymentProvider(providerName);
  const snapshot = await provider.getPayment(providerPaymentId);
  return applyPaymentResult({
    orderId,
    providerName,
    providerPaymentId,
    status: snapshot.status === "AUTHORIZED" ? "CAPTURED" : snapshot.status,
    raw: snapshot.raw,
  });
}

export async function findOrderIdByReference(reference: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .or(`id.eq.${reference},payment_reference.eq.${reference}`)
    .maybeSingle();
  return data?.id ?? null;
}
