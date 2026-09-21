import "server-only";

import { randomUUID } from "node:crypto";

import type { OrderCalculation } from "@/lib/calc/order";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { OrderInput } from "@/lib/validation/order";
import type { CampaignWithPricing, Order, OrderItem, Product } from "@/types";

import { readCollection, updateCollection } from "./local-store";

/**
 * Order persistence.
 *
 * Writes to Supabase when a service role key is available, and to the local
 * JSON store otherwise, so the full order flow works in local development
 * without a database. Amounts always come from `calculation`, which is
 * computed server-side — never from the request.
 */

export type OrderStorage = "supabase" | "local";

export interface CreateOrderInput {
  input: OrderInput;
  campaign: CampaignWithPricing | null;
  product: Product;
  calculation: OrderCalculation;
}

export interface CreateOrderResult {
  orderNumber: string;
  orderId: string;
  organizationId: string;
  storage: OrderStorage;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatOrderNumber(year: number, sequence: number): string {
  return `SOR-${year}-${String(sequence).padStart(4, "0")}`;
}

interface LocalCounter {
  year: number;
  lastNumber: number;
}

/** Local equivalent of the database's `next_order_number()`. */
async function nextLocalOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  return updateCollection<LocalCounter, string>("order-counters", (rows) => {
    const existing = rows.find((row) => row.year === year);
    const lastNumber = (existing?.lastNumber ?? 0) + 1;
    const updated = existing
      ? rows.map((row) => (row.year === year ? { ...row, lastNumber } : row))
      : [...rows, { year, lastNumber }];
    return { rows: updated, result: formatOrderNumber(year, lastNumber) };
  });
}

/* -------------------------------------------------------------------------- */
/* Supabase                                                                    */
/* -------------------------------------------------------------------------- */

async function resolveOrganizationId(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  { input, campaign }: Pick<CreateOrderInput, "input" | "campaign">,
): Promise<string> {
  // An order from a campaign link always belongs to that campaign's club.
  if (campaign) return campaign.organization.id;

  if (input.organizationNumber) {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_number", input.organizationNumber)
      .maybeSingle();
    if (data) return String((data as { id: unknown }).id);
  }

  const { data: byEmail } = await supabase
    .from("organizations")
    .select("id")
    .ilike("email", input.email)
    .ilike("name", input.organizationName)
    .maybeSingle();
  if (byEmail) return String((byEmail as { id: unknown }).id);

  // New club: create it as a lead so sales sees it in the CRM later.
  const base = slugify(input.organizationName) || "organisasjon";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: input.organizationName,
        organization_number: input.organizationNumber ?? null,
        slug,
        contact_name: input.contactName,
        email: input.email,
        phone: input.phone ?? null,
        address: input.address ?? null,
        postal_code: input.postalCode ?? null,
        city: input.city ?? null,
        status: "lead",
      })
      .select("id")
      .single();

    if (!error && data) return String((data as { id: unknown }).id);
    // 23505 = unique violation on the slug; try the next suffix.
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  throw new Error("Klarte ikke å opprette organisasjonen.");
}

async function createInSupabase(
  args: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase er ikke konfigurert.");

  const { input, campaign, product, calculation } = args;
  const organizationId = await resolveOrganizationId(supabase, { input, campaign });

  // Keep the delivery address current when the club supplied one.
  if (input.address || input.postalCode || input.city) {
    await supabase
      .from("organizations")
      .update({
        address: input.address ?? null,
        postal_code: input.postalCode ?? null,
        city: input.city ?? null,
      })
      .eq("id", organizationId);
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      organization_id: organizationId,
      campaign_id: campaign?.campaign.id ?? null,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      status: "received",
      subtotal: calculation.subtotal,
      vat: calculation.vat,
      total: calculation.total,
      organization_profit: calculation.organizationProfit,
      participants: calculation.participants,
      notes: input.notes ?? null,
      requested_delivery_date: input.requestedDeliveryDate ?? null,
      payment_status: "not_required",
    })
    .select("id, order_number")
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? "Klarte ikke å lagre bestillingen.");
  }

  const order = orderRow as { id: string; order_number: string };

  const { error: itemsError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    quantity: calculation.quantity,
    unit_price: calculation.unitPrice,
    consumer_price: calculation.consumerPrice,
    organization_margin: calculation.organizationMargin,
    line_total: calculation.lineTotal,
  });

  if (itemsError) {
    // An order without lines is worse than no order: roll it back.
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(itemsError.message);
  }

  return {
    orderNumber: order.order_number,
    orderId: order.id,
    organizationId,
    storage: "supabase",
  };
}

/* -------------------------------------------------------------------------- */
/* Local store                                                                 */
/* -------------------------------------------------------------------------- */

interface StoredOrder extends Order {
  items: OrderItem[];
  organizationName: string;
  campaignSlug?: string | null;
}

async function createLocally(args: CreateOrderInput): Promise<CreateOrderResult> {
  const { input, campaign, product, calculation } = args;

  const orderNumber = await nextLocalOrderNumber();
  const orderId = randomUUID();
  const organizationId = campaign?.organization.id ?? randomUUID();
  const now = new Date().toISOString();

  const order: StoredOrder = {
    id: orderId,
    organizationId,
    campaignId: campaign?.campaign.id ?? null,
    orderNumber,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone ?? null,
    status: "received",
    subtotal: calculation.subtotal,
    vat: calculation.vat,
    total: calculation.total,
    organizationProfit: calculation.organizationProfit,
    participants: calculation.participants,
    notes: input.notes ?? null,
    requestedDeliveryDate: input.requestedDeliveryDate ?? null,
    paymentStatus: "not_required",
    createdAt: now,
    updatedAt: now,
    organizationName: campaign?.organization.name ?? input.organizationName,
    campaignSlug: campaign?.campaign.slug ?? null,
    items: [
      {
        id: randomUUID(),
        orderId,
        productId: product.id,
        quantity: calculation.quantity,
        unitPrice: calculation.unitPrice,
        consumerPrice: calculation.consumerPrice,
        organizationMargin: calculation.organizationMargin,
        lineTotal: calculation.lineTotal,
      },
    ],
  };

  await updateCollection<StoredOrder, void>("orders", (rows) => ({
    rows: [...rows, order],
    result: undefined,
  }));

  return { orderNumber, orderId, organizationId, storage: "local" };
}

/* -------------------------------------------------------------------------- */

export async function createOrder(
  args: CreateOrderInput,
): Promise<CreateOrderResult> {
  // With a database configured, a failed write must surface as an error. The
  // local store is a development convenience, not a place orders may quietly
  // land — on a serverless host the filesystem is read-only anyway, and a
  // receipt for an order nobody received is worse than a failed submission.
  if (isSupabaseConfigured()) return createInSupabase(args);
  return createLocally(args);
}

/** Local orders, newest first. Development aid only. */
export async function listLocalOrders(): Promise<StoredOrder[]> {
  const rows = await readCollection<StoredOrder>("orders");
  return [...rows].reverse();
}
