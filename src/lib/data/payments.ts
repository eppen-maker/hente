import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

/**
 * Applies a payment result to an order.
 *
 * A payment callback or webhook has no user session behind it, so this is the
 * one write guarded by a shared secret instead of RLS. The secret unlocks the
 * `settle_order` function and nothing else. Settling is idempotent, so the
 * customer redirect and the provider webhook may race safely.
 */
export async function applyPaymentResult(args: {
  orderId: string;
  providerName: string;
  providerPaymentId: string;
  status: PaymentStatus;
}): Promise<{ orderId: string; status: OrderStatus } | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("settle_order", {
    p_secret: env.serverSecret,
    p_order_id: args.orderId,
    p_provider: args.providerName,
    p_provider_payment_id: args.providerPaymentId,
    p_status: args.status,
  });

  if (error) throw new Error(`Could not settle order: ${error.message}`);

  const result = (data ?? {}) as { orderId?: string; status?: OrderStatus; error?: string };
  if (result.error) {
    if (result.error === "NOT_FOUND") return null;
    throw new Error(`Could not settle order: ${result.error}`);
  }
  return result.orderId && result.status ? { orderId: result.orderId, status: result.status } : null;
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
  });
}

export async function findOrderIdByReference(reference: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("settle_lookup_order", {
    p_secret: env.serverSecret,
    p_reference: reference,
  });
  return (data as string | null) ?? null;
}
