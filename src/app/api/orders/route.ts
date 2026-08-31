import { NextResponse } from "next/server";

import { calculateOrder } from "@/lib/calc/order";
import { MIN_ORDER_QUANTITY } from "@/lib/config/pricing";
import { getCampaignBySlug } from "@/lib/repositories/campaigns";
import { getDefaultProduct, getLandedCostExVat } from "@/lib/repositories/catalog";
import { notifyNewOrder } from "@/lib/notifications/notify";
import { createOrder } from "@/lib/repositories/orders";
import { validateOrderInput } from "@/lib/validation/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Order submission.
 *
 * The request may propose a quantity, a participant count and contact details.
 * It may not propose prices: the campaign, product and pricing are loaded
 * server-side and every amount is recalculated here before anything is stored.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Drop idle keys so the map cannot grow without bound.
  if (hits.size > 5_000) {
    for (const [entry, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(entry);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "For mange forsøk. Prøv igjen om et minutt." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ugyldig forespørsel." }, { status: 400 });
  }

  const validation = validateOrderInput(payload);
  if (!validation.ok || !validation.data) {
    return NextResponse.json(
      { ok: false, message: "Sjekk feltene under.", errors: validation.errors },
      { status: 422 },
    );
  }

  const input = validation.data;

  try {
    // Pricing comes from the campaign when the order arrived via a partner
    // link, and from the product catalogue otherwise.
    const campaign = input.campaignSlug
      ? await getCampaignBySlug(input.campaignSlug)
      : null;

    if (input.campaignSlug && !campaign) {
      return NextResponse.json(
        {
          ok: false,
          message: "Fant ikke dugnaden. Sjekk lenken, eller ta kontakt med oss.",
          errors: { campaignSlug: "Ukjent dugnad." },
        },
        { status: 404 },
      );
    }

    const product = campaign?.product ?? (await getDefaultProduct());

    const calculation = calculateOrder({
      product,
      campaignPricing: campaign?.pricing ?? null,
      volumeTiers: campaign?.volumeTiers ?? [],
      quantity: input.quantity,
      participants: input.participants,
    });

    // Belt and braces: the schema already enforces this, but an order that
    // somehow reached zero value must never be stored.
    if (calculation.quantity < MIN_ORDER_QUANTITY || calculation.total <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Bestillingen kunne ikke beregnes.",
          errors: { quantity: `Minste bestilling er ${MIN_ORDER_QUANTITY} produkter.` },
        },
        { status: 422 },
      );
    }

    const result = await createOrder({ input, campaign, product, calculation });

    // Tell someone. Awaited rather than fired and forgotten, because a
    // serverless function can be frozen the moment it responds — but it can
    // never fail the order, and it carries its own timeout.
    //
    // The landed cost is fetched separately and only for this mail: the
    // public product query never selects it, and it must not appear in the
    // response below.
    await notifyNewOrder({
      orderNumber: result.orderNumber,
      organizationName: campaign?.organization.name ?? input.organizationName,
      campaignName: campaign?.campaign.name ?? null,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      productName: product.name,
      sku: product.sku,
      quantity: calculation.quantity,
      participants: calculation.participants,
      total: calculation.total,
      organizationProfit: calculation.organizationProfit,
      requestedDeliveryDate: input.requestedDeliveryDate ?? null,
      notes: input.notes ?? null,
      unitPrice: calculation.unitPrice,
      consumerPrice: calculation.consumerPrice,
      organizationMargin: calculation.organizationMargin,
      vatRate: product.vatRate,
      landedCostExVat: await getLandedCostExVat(product.id),
    });

    return NextResponse.json(
      {
        ok: true,
        orderNumber: result.orderNumber,
        storage: result.storage,
        // Echo the server's own figures so the receipt can never disagree
        // with what was stored.
        summary: {
          quantity: calculation.quantity,
          participants: calculation.participants,
          productsPerParticipant: calculation.productsPerParticipant,
          unitPrice: calculation.unitPrice,
          consumerPrice: calculation.consumerPrice,
          organizationMargin: calculation.organizationMargin,
          subtotal: calculation.subtotal,
          vat: calculation.vat,
          total: calculation.total,
          organizationProfit: calculation.organizationProfit,
          totalConsumerValue: calculation.totalConsumerValue,
          productName: product.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Noe gikk galt hos oss. Prøv igjen, eller send oss en e-post.",
      },
      { status: 500 },
    );
  }
}
