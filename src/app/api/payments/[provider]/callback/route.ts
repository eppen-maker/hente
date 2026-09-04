import { NextResponse, type NextRequest } from "next/server";
import { verifyAndSettleOrder } from "@/lib/data/payments";

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
    await verifyAndSettleOrder(orderId, provider, providerPaymentId);
  } catch (error) {
    console.error("payment callback failed", error);
  }

  return NextResponse.redirect(`${origin}/order/${orderId}/success`);
}
