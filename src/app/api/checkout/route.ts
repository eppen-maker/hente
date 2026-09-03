import { NextResponse, type NextRequest } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { startCheckout, CheckoutError } from "@/lib/data/checkout";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });
  }

  try {
    const result = await startCheckout(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CheckoutError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "PAYMENT_FAILED" ? 502 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("checkout failed", error);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
