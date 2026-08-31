import "server-only";

import { randomUUID } from "node:crypto";

import { aggregateEconomics, type EconomicsLine } from "@/lib/admin/economics";
import { resolvePricing } from "@/lib/config/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityEntry,
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

import { mutateSeeded, readSeeded, type VolumeTierRow } from "./store";
import { slugify } from "./orders";

/**
 * CRM data access.
 *
 * Every admin read and write goes through this module. It currently persists
 * to the local store, which is what makes the CRM usable with no database.
 * When admin authentication lands, this file is where the Supabase
 * service-role queries go — no page or action above it changes.
 */

/** True when the admin is running on local files rather than Postgres. */
export function isLocalAdminStore(): boolean {
  return !isSupabaseConfigured();
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export interface StoredOrder extends Order {
  items: OrderItem[];
  organizationName: string;
  campaignSlug?: string | null;
}

export async function listOrders(): Promise<StoredOrder[]> {
  const rows = await import("./local-store").then((m) =>
    m.readCollection<StoredOrder>("orders"),
  );
  return [...rows].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  );
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const orders = await listOrders();
  return orders.find((order) => order.id === id) ?? null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  actor: string,
): Promise<StoredOrder | null> {
  const { updateCollection } = await import("./local-store");

  const result = await updateCollection<StoredOrder, { order: StoredOrder | null; from: OrderStatus | null }>(
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

export async function listOrganizations(): Promise<Organization[]> {
  return readSeeded("organizations");
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const rows = await listOrganizations();
  return rows.find((row) => row.id === id) ?? null;
}

export async function updateOrganization(
  id: string,
  patch: Partial<Organization>,
  actor: string,
): Promise<Organization | null> {
  const updated = await mutateSeeded("organizations", (rows) => {
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

export async function listCampaigns(): Promise<Campaign[]> {
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
  const result = await mutateSeeded("campaigns", (rows) => {
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

export async function listAdminProducts(): Promise<Product[]> {
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

export async function listCampaignPricing() {
  return readSeeded("campaign-pricing");
}

export async function listOrganizationPricing() {
  return readSeeded("organization-pricing");
}

export async function listVolumePricing(): Promise<VolumeTierRow[]> {
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

export async function listDeliveries(): Promise<Delivery[]> {
  const [stored, orders] = await Promise.all([readSeeded("deliveries"), listOrders()]);
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

  const updated = await mutateSeeded("deliveries", (rows) => {
    const existing = rows.find((row) => row.orderId === orderId);
    const now = new Date().toISOString();

    const next: Delivery = existing
      ? { ...existing, ...patch, updatedAt: now }
      : {
          id: randomUUID(),
          orderId,
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
  const rows = await readSeeded("activity");
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
