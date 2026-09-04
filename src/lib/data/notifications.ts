import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSmsProvider } from "@/lib/sms";
import { customerReceipt, sellerNotification, type OrderNotificationContext } from "@/lib/sms/messages";

/**
 * Sends the receipts for a confirmed order and records every message.
 *
 * Never throws: a failed text must not roll back a paid order. Failures are
 * written to `sms_messages` with the provider's error so the club can see
 * exactly what happened.
 */
export async function sendOrderReceipts(orderId: string): Promise<{ sent: number; failed: number }> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("order_notification_context", { p_order_id: orderId });
  if (!data) return { sent: 0, failed: 0 };

  const context = data as unknown as OrderNotificationContext;
  if (context.status !== "PAID") return { sent: 0, failed: 0 };

  const provider = getSmsProvider();
  const messages: { to: string | null; kind: string; body: string }[] = [
    { to: context.customerPhone, kind: "customer_receipt", body: customerReceipt(context) },
    { to: context.sellerPhone, kind: "seller_new_order", body: sellerNotification(context) },
  ];

  let sent = 0;
  let failed = 0;

  for (const message of messages) {
    if (!message.to) continue;
    let result: { ok: boolean; providerRef?: string; error?: string };
    try {
      result = await provider.send({ to: message.to, body: message.body });
    } catch (cause) {
      result = { ok: false, error: cause instanceof Error ? cause.message : "send failed" };
    }

    if (result.ok) sent += 1;
    else failed += 1;

    await supabase.rpc("log_sms", {
      p_order_id: orderId,
      p_seller_id: context.sellerId,
      p_recipient: message.to,
      p_kind: message.kind,
      p_body: message.body,
      p_provider: provider.name,
      p_provider_ref: result.providerRef ?? null,
      p_status: result.ok ? "SENT" : "FAILED",
      p_error: result.error ?? null,
    });
  }

  return { sent, failed };
}

export { customerReceipt, sellerNotification };
export type { OrderNotificationContext };
