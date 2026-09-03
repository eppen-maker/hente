import { NextResponse, type NextRequest } from "next/server";
import { verifyAndSettleOrder } from "@/lib/data/payments";
import { createAdminSupabase } from "@/lib/supabase/admin";

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

  const supabase = createAdminSupabase();
  const { data: order } = await supabase.from("orders").select("id, payment_reference").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.redirect(`${origin}/`);

  const providerPaymentId = searchParams.get("paymentId") ?? order.payment_reference ?? orderId;

  try {
    await verifyAndSettleOrder(orderId, provider, providerPaymentId);
  } catch (error) {
    console.error("payment callback failed", error);
  }

  return NextResponse.redirect(`${origin}/order/${orderId}/success`);
}
