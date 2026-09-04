import { NextResponse, type NextRequest } from "next/server";
import { verifyAndSettleOrder } from "@/lib/data/payments";
import { sendOrderReceipts } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

/**
 * Where the payment provider returns the customer. The redirect is never
 * trusted on its own — the payment is re-read from the provider before the
 * order is marked paid.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { searchParams, origin } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.redirect(`${origin}/`);

  // Providers either hand the payment id back on the redirect, or use our own
  // order id as their reference.
  const providerPaymentId = searchParams.get("paymentId") ?? orderId;

  try {
    const settled = await verifyAndSettleOrder(orderId, provider, providerPaymentId);
    if (settled?.status === "PAID") await sendOrderReceipts(orderId);
  } catch (error) {
    console.error("payment callback failed", error);
  }

  return NextResponse.redirect(`${origin}/order/${orderId}/success`);
}
