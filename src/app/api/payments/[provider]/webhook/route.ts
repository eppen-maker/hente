import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { findOrderIdByReference, verifyAndSettleOrder } from "@/lib/data/payments";

export const dynamic = "force-dynamic";

/**
 * Provider webhook endpoint: POST /api/payments/{provider}/webhook
 *
 * The body is parsed by the provider implementation, then the payment is
 * re-read from the provider API before anything is written. That keeps the
 * endpoint safe even before webhook signature verification is provisioned.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params;

  let provider;
  try {
    provider = getPaymentProvider(providerName);
  } catch {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const headers = Object.fromEntries(request.headers.entries());

  const event = await provider.parseWebhook(body, headers);
  if (!event) return NextResponse.json({ received: true, ignored: true });

  const orderId = await findOrderIdByReference(event.providerReference);
  if (!orderId) return NextResponse.json({ received: true, unknownOrder: true }, { status: 202 });

  try {
    await verifyAndSettleOrder(orderId, providerName, event.providerPaymentId);
  } catch (error) {
    console.error("webhook settle failed", error);
    return NextResponse.json({ error: "Could not settle order" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
