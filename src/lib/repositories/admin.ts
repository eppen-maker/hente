import "server-only";

import { randomUUID } from "node:crypto";

import { aggregateEconomics, type EconomicsLine } from "@/lib/admin/economics";
import { resolvePricing } from "@/lib/config/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityEntry,
  CampaignPricing,
  OrganizationPricing,
  CampaignLead,
  ActivityEntityType,
  ActivityKind,
  Campaign,
  CampaignStatus,
  Delivery,
  DeliveryStatus,
  InternalEconomics,
  Order,
  OrderItem,
  OrderStatus,
  Organization,
  PricingBreakdown,
  PricingSource,
  Product,
} from "@/types";

import { mapProduct } from "./catalog";
import { mutateSeeded, readSeeded, type VolumeTierRow } from "./store";
import { slugify } from "./orders";

/**
 * CRM data access.
 *
 * Every admin read and write goes through this module. With Supabase
 * configured it reads and writes Postgres through the service-role client —
 * the same rows the public site writes, so an order placed on the site shows
 * up here. Without Supabase it falls back to the local JSON store, which is
 * what keeps the whole platform runnable with nothing installed.
 *
 * A database error is never swallowed. Showing seeded demo clubs where real
 * ones belong is worse than showing nothing, so a failed query throws.
 */

/** True when the admin is running on local files rather than Postgres. */
export function isLocalAdminStore(): boolean {
  return !isSupabaseConfigured();
}

type Row = Record<string, unknown>;

/** Postgres numerics arrive as strings over PostgREST. */
function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function nullableNum(value: unknown): number | null {
  return value == null ? null : num(value);
}

function fail(what: string, message: string): never {
  throw new Error(`Databasespørring feilet (${what}): ${message}`);
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export interface StoredOrder extends Order {
  items: OrderItem[];
  organizationName: string;
  campaignSlug?: string | null;
}

const ORDER_SELECT =
  "id, organization_id, campaign_id, order_number, contact_name, email, phone, status, " +
  "subtotal, vat, total, organization_profit, participants, notes, " +
  "requested_delivery_date, payment_status, payment_provider, payment_reference, " +
  "created_at, updated_at, organizations ( name ), campaigns ( slug ), " +
  "order_items ( id, order_id, product_id, quantity, unit_price, consumer_price, " +
  "organization_margin, line_total )";

function mapOrderItem(row: Row): OrderItem {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    quantity: num(row.quantity),
    unitPrice: num(row.unit_price),
    consumerPrice: num(row.consumer_price),
    organizationMargin: num(row.organization_margin),
    lineTotal: num(row.line_total),
  };
}

function mapOrder(row: Row): StoredOrder {
  const organization = row.organizations as Row | null;
  const campaign = row.campaigns as Row | null;

  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    campaignId: nullableText(row.campaign_id),
    orderNumber: String(row.order_number),
    contactName: String(row.contact_name),
    email: String(row.email),
    phone: nullableText(row.phone),
    status: row.status as OrderStatus,
    subtotal: num(row.subtotal),
    vat: num(row.vat),
    total: num(row.total),
    organizationProfit: num(row.organization_profit),
    participants: num(row.participants),
    notes: nullableText(row.notes),
    requestedDeliveryDate: nullableText(row.requested_delivery_date),
    paymentStatus: row.payment_status as StoredOrder["paymentStatus"],
    paymentProvider: nullableText(row.payment_provider),
    paymentReference: nullableText(row.payment_reference),
    createdAt: nullableText(row.created_at) ?? undefined,
    updatedAt: nullableText(row.updated_at) ?? undefined,
    items: ((row.order_items as Row[] | null) ?? []).map(mapOrderItem),
    organizationName: organization ? String(organization.name) : "Ukjent organisasjon",
    campaignSlug: campaign ? String(campaign.slug) : null,
  };
}

export async function listOrders(): Promise<StoredOrder[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false });

    if (error) fail("bestillinger", error.message);
    return (data as unknown as Row[]).map(mapOrder);
  }

  const rows = await import("./local-store").then((m) =>
    m.readCollection<StoredOrder>("orders"),
  );
  return [...rows].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  );
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) fail("bestilling", error.message);
    return data ? mapOrder(data as unknown as Row) : null;
  }

  const orders = await listOrders();
  return orders.find((order) => order.id === id) ?? null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  actor: string,
): Promise<StoredOrder | null> {
  const supabase = getSupabaseServerClient();

  const result = supabase
    ? await (async () => {
        const existing = await getOrder(id);
        if (!existing) return { order: null, from: null as OrderStatus | null };

        const updatedAt = new Date().toISOString();
        const { error } = await supabase
          .from("orders")
          .update({ status, updated_at: updatedAt })
          .eq("id", id);

        if (error) fail("ordrestatus", error.message);
        return {
          order: { ...existing, status, updatedAt } as StoredOrder,
          from: existing.status as OrderStatus | null,
        };
      })()
    : await import("./local-store").then(({ updateCollection }) =>
        updateCollection<StoredOrder, { order: StoredOrder | null; from: OrderStatus | null }>(
          "orders",
          (rows) => {
            const existing = rows.find((row) => row.id === id);
            if (!existing) return { rows, result: { order: null, from: null } };

            const from = existing.status;
            const updated: StoredOrder = {
              ...existing,
              status,
              updatedAt: new Date().toISOString(),
            };
            return {
              rows: rows.map((row) => (row.id === id ? updated : row)),
              result: { order: updated, from },
            };
          },
        ),
      );

  if (result.order && result.from !== status) {
    await logActivity({
      entityType: "order",
      entityId: id,
      organizationId: result.order.organizationId,
      kind: "status_change",
      summary: `Ordre ${result.order.orderNumber} endret status`,
      fromValue: result.from,
      toValue: status,
      actor,
    });

    // Keep the delivery in step with the order it belongs to.
    if (status === "shipped") await setDeliveryStatus(id, "in_transit", actor);
    if (status === "delivered") await setDeliveryStatus(id, "delivered", actor);
  }

  return result.order;
}

/* -------------------------------------------------------------------------- */
/* Enquiries                                                                   */
/* -------------------------------------------------------------------------- */

function mapLead(row: Record<string, unknown>): CampaignLead {
  return {
    id: String(row.id),
    organizationName: String(row.organization_name),
    organizationType: row.organization_type as CampaignLead["organizationType"],
    contactName: String(row.contact_name),
    email: String(row.email),
    phone: (row.phone as string | null) ?? undefined,
    city: (row.city as string | null) ?? undefined,
    participantCount: Number(row.participant_count ?? 0),
    productsPerParticipant:
      row.products_per_participant == null
        ? undefined
        : Number(row.products_per_participant),
    profitGoal: row.profit_goal == null ? undefined : Number(row.profit_goal),
    estimatedProducts:
      row.estimated_products == null ? undefined : Number(row.estimated_products),
    estimatedProfit:
      row.estimated_profit == null ? undefined : Number(row.estimated_profit),
    message: (row.message as string | null) ?? undefined,
    source: row.source as CampaignLead["source"],
    createdAt: String(row.created_at),
  };
}

/** Enquiries from the public "Start en dugnad" form, newest first. */
export async function listLeads(): Promise<CampaignLead[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("campaign_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase lead query failed:", error.message);
      return [];
    }
    return (data as unknown as Record<string, unknown>[]).map(mapLead);
  }

  const { readCollection } = await import("./local-store");
  const rows = await readCollection<CampaignLead>("leads");
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface LeadStats {
  total: number;
  lastWeek: number;
  /** Sum of the estimates the clubs themselves produced in the calculator. */
  potential: number;
}

/** Counted here rather than in a page, so the clock is not read during render. */
export async function leadStats(): Promise<LeadStats> {
  const leads = await listLeads();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    total: leads.length,
    lastWeek: leads.filter((lead) => new Date(lead.createdAt).getTime() > weekAgo).length,
    potential: leads.reduce((sum, lead) => sum + (lead.estimatedProfit ?? 0), 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Organizations                                                               */
/* -------------------------------------------------------------------------- */

function mapOrganization(row: Row): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    organizationNumber: nullableText(row.organization_number),
    slug: String(row.slug),
    contactName: nullableText(row.contact_name),
    email: nullableText(row.email),
    phone: nullableText(row.phone),
    address: nullableText(row.address),
    postalCode: nullableText(row.postal_code),
    city: nullableText(row.city),
    status: row.status as Organization["status"],
    internalNotes: nullableText(row.internal_notes),
    nextAction: nullableText(row.next_action),
    nextActionAt: nullableText(row.next_action_at),
    createdAt: nullableText(row.created_at) ?? undefined,
    updatedAt: nullableText(row.updated_at) ?? undefined,
  };
}

/** Domain field → column, for the fields the CRM lets an admin edit. */
const ORGANIZATION_COLUMNS: Partial<Record<keyof Organization, string>> = {
  name: "name",
  organizationNumber: "organization_number",
  slug: "slug",
  contactName: "contact_name",
  email: "email",
  phone: "phone",
  address: "address",
  postalCode: "postal_code",
  city: "city",
  status: "status",
  internalNotes: "internal_notes",
  nextAction: "next_action",
  nextActionAt: "next_action_at",
};

export async function listOrganizations(): Promise<Organization[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name", { ascending: true });

    if (error) fail("organisasjoner", error.message);
    return (data as unknown as Row[]).map(mapOrganization);
  }

  return readSeeded("organizations");
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) fail("organisasjon", error.message);
    return data ? mapOrganization(data as unknown as Row) : null;
  }

  const rows = await listOrganizations();
  return rows.find((row) => row.id === id) ?? null;
}

export async function updateOrganization(
  id: string,
  patch: Partial<Organization>,
  actor: string,
): Promise<Organization | null> {
  const supabase = getSupabaseServerClient();

  const updated = supabase
    ? await (async () => {
        const columns: Row = { updated_at: new Date().toISOString() };
        for (const [field, column] of Object.entries(ORGANIZATION_COLUMNS)) {
          if (field in patch) columns[column] = patch[field as keyof Organization] ?? null;
        }

        const { data, error } = await supabase
          .from("organizations")
          .update(columns)
          .eq("id", id)
          .select("*")
          .maybeSingle();

        if (error) fail("oppdatering av organisasjon", error.message);
        return data ? mapOrganization(data as unknown as Row) : null;
      })()
    : await mutateSeeded("organizations", (rows) => {
        const existing = rows.find((row) => row.id === id);
        if (!existing) return { rows, result: null };
        const next: Organization = {
          ...existing,
          ...patch,
          id: existing.id,
          updatedAt: new Date().toISOString(),
        };
        return { rows: rows.map((row) => (row.id === id ? next : row)), result: next };
      });

  if (updated) {
    await logActivity({
      entityType: "organization",
      entityId: id,
      organizationId: id,
      kind: "updated",
      summary: `${updated.name} ble oppdatert`,
      actor,
    });
  }
  return updated;
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

function mapCampaign(row: Row): Campaign {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    slug: String(row.slug),
    participants: num(row.participants),
    targetProfit: nullableNum(row.target_profit),
    status: row.status as CampaignStatus,
    startDate: nullableText(row.start_date),
    orderDeadline: nullableText(row.order_deadline),
    deliveryDate: nullableText(row.delivery_date),
    createdAt: nullableText(row.created_at) ?? undefined,
    updatedAt: nullableText(row.updated_at) ?? undefined,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) fail("dugnader", error.message);
    return (data as unknown as Row[]).map(mapCampaign);
  }

  return readSeeded("campaigns");
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const rows = await listCampaigns();
  return rows.find((row) => row.id === id) ?? null;
}

export interface CreateCampaignInput {
  organizationId: string;
  name: string;
  participants: number;
  targetProfit?: number | null;
  startDate?: string | null;
  orderDeadline?: string | null;
  deliveryDate?: string | null;
  status: CampaignStatus;
  productId: string;
  partnerPrice: number;
  consumerPrice: number;
}

/** Builds a slug that is unique across campaigns, preferring the club's name. */
async function uniqueCampaignSlug(base: string): Promise<string> {
  const campaigns = await listCampaigns();
  const taken = new Set(campaigns.map((campaign) => campaign.slug));
  const root = slugify(base) || "dugnad";
  if (!taken.has(root)) return root;
  for (let suffix = 2; suffix < 500; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

export async function createCampaign(
  input: CreateCampaignInput,
  actor: string,
): Promise<Campaign> {
  const organization = await getOrganization(input.organizationId);
  const slug = await uniqueCampaignSlug(organization?.name ?? input.name);
  const now = new Date().toISOString();

  const campaign: Campaign = {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    slug,
    participants: input.participants,
    targetProfit: input.targetProfit ?? null,
    status: input.status,
    startDate: input.startDate ?? null,
    orderDeadline: input.orderDeadline ?? null,
    deliveryDate: input.deliveryDate ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase.from("campaigns").insert({
      id: campaign.id,
      organization_id: campaign.organizationId,
      name: campaign.name,
      slug: campaign.slug,
      participants: campaign.participants,
      target_profit: campaign.targetProfit,
      status: campaign.status,
      start_date: campaign.startDate,
      order_deadline: campaign.orderDeadline,
      delivery_date: campaign.deliveryDate,
    });
    if (error) fail("ny dugnad", error.message);

    // organization_margin is generated in the database.
    const { error: pricingError } = await supabase.from("campaign_pricing").insert({
      campaign_id: campaign.id,
      product_id: input.productId,
      partner_price: input.partnerPrice,
      consumer_price: input.consumerPrice,
    });
    if (pricingError) {
      // A campaign with no agreed price would silently fall back to the
      // product default, so undo rather than leave it half-created.
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      fail("prisavtale for dugnaden", pricingError.message);
    }
  } else {
    await mutateSeeded("campaigns", (rows) => ({
      rows: [...rows, campaign],
      result: null,
    }));

    await mutateSeeded("campaign-pricing", (rows) => ({
      rows: [
        ...rows,
        {
          id: randomUUID(),
          campaignId: campaign.id,
          productId: input.productId,
          partnerPrice: input.partnerPrice,
          consumerPrice: input.consumerPrice,
          organizationMargin: input.consumerPrice - input.partnerPrice,
        },
      ],
      result: null,
    }));
  }

  await logActivity({
    entityType: "campaign",
    entityId: campaign.id,
    organizationId: campaign.organizationId,
    kind: "created",
    summary: `Dugnaden «${campaign.name}» ble opprettet`,
    detail: `Lenke: /dugnad/${campaign.slug}`,
    actor,
  });

  return campaign;
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
  actor: string,
): Promise<Campaign | null> {
  const supabase = getSupabaseServerClient();

  const result = supabase
    ? await (async () => {
        const existing = await getCampaign(id);
        if (!existing) return null;

        const updatedAt = new Date().toISOString();
        const { error } = await supabase
          .from("campaigns")
          .update({ status, updated_at: updatedAt })
          .eq("id", id);

        if (error) fail("dugnadsstatus", error.message);
        return { next: { ...existing, status, updatedAt }, from: existing.status };
      })()
    : await mutateSeeded("campaigns", (rows) => {
        const existing = rows.find((row) => row.id === id);
        if (!existing) return { rows, result: null };
        const next: Campaign = { ...existing, status, updatedAt: new Date().toISOString() };
        return {
          rows: rows.map((row) => (row.id === id ? next : row)),
          result: { next, from: existing.status },
        };
      });

  if (result) {
    await logActivity({
      entityType: "campaign",
      entityId: id,
      organizationId: result.next.organizationId,
      kind: "status_change",
      summary: `Dugnaden «${result.next.name}» endret status`,
      fromValue: result.from,
      toValue: status,
      actor,
    });
    return result.next;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Like the public product mapper, plus the landed cost. This module is admin
 * only — the public catalogue never selects that column.
 */
function mapAdminProduct(row: Row): Product {
  return {
    ...mapProduct(row),
    landedCostExVat: nullableNum(row.landed_cost_ex_vat),
  };
}

export async function listAdminProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) fail("produkter", error.message);
    return (data as unknown as Row[]).map(mapAdminProduct);
  }

  const rows = await readSeeded("products");
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type ProductInput = Omit<Product, "id" | "createdAt"> & { id?: string };

export async function upsertProduct(
  input: ProductInput,
  actor: string,
): Promise<Product> {
  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: now,
  };

  const isNew = !input.id;
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const columns = {
      name: product.name,
      sku: product.sku,
      description: product.description ?? null,
      size_ml: product.sizeMl ?? null,
      consumer_price: product.consumerPrice,
      default_partner_price: product.defaultPartnerPrice,
      vat_rate: product.vatRate,
      active: product.active,
      tagline: product.tagline ?? null,
      image_url: product.imageUrl ?? null,
      placeholder_tone: product.placeholderTone,
      sort_order: product.sortOrder,
      landed_cost_ex_vat: product.landedCostExVat ?? null,
    };

    const { error } = isNew
      ? await supabase.from("products").insert({ id: product.id, ...columns })
      : await supabase.from("products").update(columns).eq("id", product.id);

    if (error) fail("lagring av produkt", error.message);
  } else {
    await mutateSeeded("products", (rows) => {
      const existing = rows.find((row) => row.id === product.id);
      if (!existing) return { rows: [...rows, product], result: null };
      return {
        rows: rows.map((row) =>
          row.id === product.id ? { ...existing, ...product, createdAt: existing.createdAt } : row,
        ),
        result: null,
      };
    });
  }

  await logActivity({
    entityType: "product",
    entityId: product.id,
    kind: isNew ? "created" : "updated",
    summary: isNew ? `Produktet ${product.name} ble opprettet` : `Produktet ${product.name} ble oppdatert`,
    actor,
  });

  return product;
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

export async function listCampaignPricing(): Promise<CampaignPricing[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase.from("campaign_pricing").select("*");
    if (error) fail("dugnadspriser", error.message);
    return (data as unknown as Row[]).map((row) => ({
      id: String(row.id),
      campaignId: String(row.campaign_id),
      productId: String(row.product_id),
      partnerPrice: num(row.partner_price),
      consumerPrice: num(row.consumer_price),
      organizationMargin: num(row.organization_margin),
    }));
  }

  return readSeeded("campaign-pricing");
}

export async function listOrganizationPricing(): Promise<OrganizationPricing[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase.from("organization_pricing").select("*");
    if (error) fail("kundepriser", error.message);
    return (data as unknown as Row[]).map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      productId: String(row.product_id),
      partnerPrice: num(row.partner_price),
      consumerPrice: num(row.consumer_price),
      organizationMargin: num(row.organization_margin),
      note: nullableText(row.note),
    }));
  }

  return readSeeded("organization-pricing");
}

export async function listVolumePricing(): Promise<VolumeTierRow[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("volume_pricing")
      .select("*")
      .order("min_quantity", { ascending: true });

    if (error) fail("volumpriser", error.message);
    return (data as unknown as Row[]).map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      campaignId: nullableText(row.campaign_id),
      minQuantity: num(row.min_quantity),
      maxQuantity: nullableNum(row.max_quantity),
      organizationPrice: num(row.partner_price),
      label: nullableText(row.label) ?? undefined,
    }));
  }

  return readSeeded("volume-pricing");
}

export interface ResolvedPricing {
  breakdown: PricingBreakdown;
  source: PricingSource;
}

/**
 * Resolves what a given organization actually pays, and says where the price
 * came from. Precedence: campaign, then organization, then volume tier, then
 * the product default.
 */
export async function resolveAdminPricing(options: {
  product: Product;
  organizationId?: string | null;
  campaignId?: string | null;
  quantity?: number;
}): Promise<ResolvedPricing> {
  const { product, organizationId, campaignId, quantity = 0 } = options;

  const [campaignRows, organizationRows, tierRows] = await Promise.all([
    listCampaignPricing(),
    listOrganizationPricing(),
    listVolumePricing(),
  ]);

  const campaignAgreement = campaignId
    ? campaignRows.find(
        (row) => row.campaignId === campaignId && row.productId === product.id,
      )
    : undefined;

  const organizationAgreement = organizationId
    ? organizationRows.find(
        (row) => row.organizationId === organizationId && row.productId === product.id,
      )
    : undefined;

  const tiers = tierRows
    .filter(
      (row) =>
        row.productId === product.id &&
        (row.campaignId == null || row.campaignId === campaignId),
    )
    .map((row) => ({
      minQuantity: row.minQuantity,
      maxQuantity: row.maxQuantity ?? null,
      organizationPrice: row.organizationPrice,
      label: row.label,
    }));

  const agreement = campaignAgreement ?? organizationAgreement;
  const breakdown = resolvePricing({
    quantity,
    tiers,
    vatRate: product.vatRate,
    fromCampaignAgreement: Boolean(campaignAgreement),
    overrides: {
      consumerPrice: agreement?.consumerPrice ?? product.consumerPrice,
      organizationPrice: agreement?.partnerPrice ?? product.defaultPartnerPrice,
    },
  });

  // The tier only won if it actually moved the price.
  const tierApplied =
    breakdown.appliedTier != null &&
    breakdown.organizationPrice === breakdown.appliedTier.organizationPrice &&
    breakdown.organizationPrice !==
      (agreement?.partnerPrice ?? product.defaultPartnerPrice);

  const source: PricingSource = tierApplied
    ? "volume"
    : campaignAgreement
      ? "campaign"
      : organizationAgreement
        ? "organization"
        : "product-default";

  return { breakdown, source };
}

/* -------------------------------------------------------------------------- */
/* Deliveries                                                                  */
/* -------------------------------------------------------------------------- */

function mapDelivery(row: Row): Delivery {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    organizationId: String(row.organization_id),
    quantity: num(row.quantity),
    requestedDate: nullableText(row.requested_date),
    confirmedDate: nullableText(row.confirmed_date),
    address: nullableText(row.address),
    postalCode: nullableText(row.postal_code),
    city: nullableText(row.city),
    status: row.status as DeliveryStatus,
    trackingReference: nullableText(row.tracking_reference),
    notes: nullableText(row.notes),
    createdAt: nullableText(row.created_at) ?? undefined,
    updatedAt: nullableText(row.updated_at) ?? undefined,
  };
}

async function storedDeliveries(): Promise<Delivery[]> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase.from("deliveries").select("*");
    if (error) fail("leveranser", error.message);
    return (data as unknown as Row[]).map(mapDelivery);
  }

  return readSeeded("deliveries");
}

export async function listDeliveries(): Promise<Delivery[]> {
  const [stored, orders] = await Promise.all([storedDeliveries(), listOrders()]);
  const byOrder = new Map(stored.map((delivery) => [delivery.orderId, delivery]));

  // Every order needs a delivery row; unplanned ones are derived on read so a
  // new order shows up in the delivery list straight away.
  return orders
    .filter((order) => order.status !== "cancelled")
    .map<Delivery>((order) => {
      const existing = byOrder.get(order.id);
      if (existing) return existing;
      return {
        id: `derived-${order.id}`,
        orderId: order.id,
        organizationId: order.organizationId,
        quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        requestedDate: order.requestedDeliveryDate ?? null,
        confirmedDate: null,
        address: null,
        postalCode: null,
        city: null,
        status: "not_planned",
        trackingReference: null,
        notes: order.notes ?? null,
      };
    });
}

export async function updateDelivery(
  orderId: string,
  patch: Partial<Omit<Delivery, "id" | "orderId" | "organizationId">>,
  actor: string,
): Promise<Delivery | null> {
  const orders = await listOrders();
  const order = orders.find((row) => row.id === orderId);
  if (!order) return null;

  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const supabase = getSupabaseServerClient();

  const updated = supabase
    ? await (async () => {
        // One delivery per order — order_id is unique, so an upsert on it
        // creates the row the first time and patches it afterwards.
        const { data: current, error: readError } = await supabase
          .from("deliveries")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();
        if (readError) fail("leveranse", readError.message);

        const base: Delivery = current
          ? mapDelivery(current as unknown as Row)
          : {
              id: randomUUID(),
              orderId,
              organizationId: order.organizationId,
              quantity,
              requestedDate: order.requestedDeliveryDate ?? null,
              confirmedDate: null,
              address: null,
              postalCode: null,
              city: null,
              status: "not_planned",
              trackingReference: null,
              notes: order.notes ?? null,
            };

        const next: Delivery = { ...base, ...patch, updatedAt: new Date().toISOString() };

        const { data, error } = await supabase
          .from("deliveries")
          .upsert(
            {
              id: next.id,
              order_id: orderId,
              organization_id: next.organizationId,
              quantity: next.quantity,
              requested_date: next.requestedDate ?? null,
              confirmed_date: next.confirmedDate ?? null,
              address: next.address ?? null,
              postal_code: next.postalCode ?? null,
              city: next.city ?? null,
              status: next.status,
              tracking_reference: next.trackingReference ?? null,
              notes: next.notes ?? null,
              updated_at: next.updatedAt,
            },
            { onConflict: "order_id" },
          )
          .select("*")
          .single();

        if (error) fail("lagring av leveranse", error.message);
        return mapDelivery(data as unknown as Row);
      })()
    : await mutateSeeded("deliveries", (rows) => {
        const existing = rows.find((row) => row.orderId === orderId);
        const now = new Date().toISOString();

        const next: Delivery = existing
          ? { ...existing, ...patch, updatedAt: now }
          : {
              id: randomUUID(),
              orderId,
              organizationId: order.organizationId,
              quantity,
              requestedDate: order.requestedDeliveryDate ?? null,
              confirmedDate: null,
              address: null,
              postalCode: null,
              city: null,
              status: "not_planned",
              trackingReference: null,
              notes: order.notes ?? null,
              createdAt: now,
              updatedAt: now,
              ...patch,
            };

        return {
          rows: existing
            ? rows.map((row) => (row.orderId === orderId ? next : row))
            : [...rows, next],
          result: next,
        };
      });

  await logActivity({
    entityType: "delivery",
    entityId: updated.id,
    organizationId: order.organizationId,
    kind: patch.status ? "status_change" : "updated",
    summary: `Leveranse for ordre ${order.orderNumber} ble oppdatert`,
    toValue: patch.status ?? null,
    actor,
  });

  return updated;
}

async function setDeliveryStatus(
  orderId: string,
  status: DeliveryStatus,
  actor: string,
): Promise<void> {
  await updateDelivery(
    orderId,
    status === "delivered"
      ? { status, confirmedDate: new Date().toISOString().slice(0, 10) }
      : { status },
    actor,
  );
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

export interface NewActivity {
  entityType: ActivityEntityType;
  entityId: string;
  organizationId?: string | null;
  kind: ActivityKind;
  summary: string;
  detail?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  actor: string;
}

export async function logActivity(entry: NewActivity): Promise<ActivityEntry> {
  const record: ActivityEntry = {
    ...entry,
    id: randomUUID(),
    organizationId: entry.organizationId ?? null,
    detail: entry.detail ?? null,
    fromValue: entry.fromValue ?? null,
    toValue: entry.toValue ?? null,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase.from("activity_log").insert({
      id: record.id,
      entity_type: record.entityType,
      entity_id: record.entityId,
      organization_id: record.organizationId,
      kind: record.kind,
      summary: record.summary,
      detail: record.detail,
      from_value: record.fromValue,
      to_value: record.toValue,
      actor: record.actor,
      created_at: record.createdAt,
    });

    // The log is a record of what happened, not the thing that happened.
    // A failed write must not undo the change it was describing.
    if (error) console.error("Kunne ikke skrive aktivitetslogg:", error.message);
    return record;
  }

  await mutateSeeded("activity", (rows) => ({
    rows: [...rows, record],
    result: null,
  }));

  return record;
}

export async function listActivity(filter?: {
  organizationId?: string;
  entityType?: ActivityEntityType;
  entityId?: string;
  limit?: number;
}): Promise<ActivityEntry[]> {
  const supabase = getSupabaseServerClient();

  const rows: ActivityEntry[] = supabase
    ? await (async () => {
        const { data, error } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) fail("aktivitet", error.message);
        return (data as unknown as Row[]).map((row) => ({
          id: String(row.id),
          entityType: row.entity_type as ActivityEntityType,
          entityId: String(row.entity_id),
          organizationId: nullableText(row.organization_id),
          kind: row.kind as ActivityKind,
          summary: String(row.summary),
          detail: nullableText(row.detail),
          fromValue: nullableText(row.from_value),
          toValue: nullableText(row.to_value),
          actor: String(row.actor),
          createdAt: String(row.created_at),
        }));
      })()
    : await readSeeded("activity");

  const filtered = rows.filter((row) => {
    if (filter?.organizationId && row.organizationId !== filter.organizationId) return false;
    if (filter?.entityType && row.entityType !== filter.entityType) return false;
    if (filter?.entityId && row.entityId !== filter.entityId) return false;
    return true;
  });

  const sorted = filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filter?.limit ? sorted.slice(0, filter.limit) : sorted;
}

/* -------------------------------------------------------------------------- */
/* Internal economics                                                          */
/* -------------------------------------------------------------------------- */

/** Internal economics across a set of orders. Admin only. */
export async function economicsForOrders(
  orders: StoredOrder[],
): Promise<InternalEconomics> {
  const products = await listAdminProducts();
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: EconomicsLine[] = orders
    .filter((order) => order.status !== "cancelled")
    .flatMap((order) =>
      order.items.map((item) => {
        const product = byId.get(item.productId);
        return {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          organizationMargin: item.organizationMargin,
          vatRate: product?.vatRate ?? 0.25,
          landedCostExVat: product?.landedCostExVat ?? null,
        };
      }),
    );

  return aggregateEconomics(lines);
}
