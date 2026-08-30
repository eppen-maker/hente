import "server-only";

import {
  economicsForOrders,
  listActivity,
  listAdminProducts,
  listCampaigns,
  listDeliveries,
  listOrders,
  listOrganizations,
  resolveAdminPricing,
  type StoredOrder,
} from "@/lib/repositories/admin";
import { OPEN_CAMPAIGN_STATUSES } from "@/lib/admin/status";
import type {
  ActivityEntry,
  Campaign,
  Delivery,
  InternalEconomics,
  Organization,
  PricingSource,
  Product,
} from "@/types";

/**
 * Derived views for the CRM.
 *
 * Aggregation happens here rather than in the pages, so the dashboard, the
 * organization list and the 360 view cannot disagree about a total.
 */

const ACTIVE_ORDER_STATUSES = ["received", "confirmed", "in_production", "packed", "shipped"];

function units(order: StoredOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

/* -------------------------------------------------------------------------- */
/* Organizations                                                               */
/* -------------------------------------------------------------------------- */

export interface OrganizationSummary {
  organization: Organization;
  activeCampaign: Campaign | null;
  campaignCount: number;
  orderCount: number;
  totalUnits: number;
  /** Invoiced value, incl. VAT. */
  totalOrderValue: number;
  /** What the club keeps across all its orders. */
  totalOrganizationProfit: number;
  averageUnitsPerParticipant: number | null;
  nextAction: string | null;
}

export async function organizationSummaries(): Promise<OrganizationSummary[]> {
  const [organizations, campaigns, orders] = await Promise.all([
    listOrganizations(),
    listCampaigns(),
    listOrders(),
  ]);

  return organizations
    .map<OrganizationSummary>((organization) => {
      const own = campaigns.filter((c) => c.organizationId === organization.id);
      const ownOrders = orders.filter(
        (o) => o.organizationId === organization.id && o.status !== "cancelled",
      );
      const activeCampaign =
        own.find((c) => OPEN_CAMPAIGN_STATUSES.includes(c.status)) ??
        own.find((c) => c.status !== "completed" && c.status !== "cancelled") ??
        null;

      const totalUnits = ownOrders.reduce((sum, order) => sum + units(order), 0);
      const participants = activeCampaign?.participants ?? 0;

      return {
        organization,
        activeCampaign,
        campaignCount: own.length,
        orderCount: ownOrders.length,
        totalUnits,
        totalOrderValue: ownOrders.reduce((sum, order) => sum + order.total, 0),
        totalOrganizationProfit: ownOrders.reduce(
          (sum, order) => sum + order.organizationProfit,
          0,
        ),
        averageUnitsPerParticipant:
          participants > 0 && totalUnits > 0 ? totalUnits / participants : null,
        nextAction: organization.nextAction ?? defaultNextAction(organization, activeCampaign, ownOrders),
      };
    })
    .sort((a, b) => b.totalOrderValue - a.totalOrderValue);
}

/** A sensible suggestion when nobody has set an explicit next action. */
function defaultNextAction(
  organization: Organization,
  activeCampaign: Campaign | null,
  orders: StoredOrder[],
): string {
  if (orders.some((order) => order.status === "received")) return "Bekreft bestilling";
  if (activeCampaign && orders.length === 0) return "Følg opp åpen dugnad";
  if (!activeCampaign && organization.status === "lead") return "Ta kontakt";
  if (!activeCampaign) return "Planlegg neste dugnad";
  return "Ingen";
}

export interface OrganizationDetail extends OrganizationSummary {
  campaigns: Campaign[];
  orders: StoredOrder[];
  activity: ActivityEntry[];
  economics: InternalEconomics;
  pricing: { product: Product; price: number; consumerPrice: number; margin: number; source: PricingSource }[];
}

export async function organizationDetail(id: string): Promise<OrganizationDetail | null> {
  const summaries = await organizationSummaries();
  const summary = summaries.find((item) => item.organization.id === id);
  if (!summary) return null;

  const [campaigns, orders, activity, products] = await Promise.all([
    listCampaigns(),
    listOrders(),
    listActivity({ organizationId: id, limit: 50 }),
    listAdminProducts(),
  ]);

  const ownOrders = orders.filter((order) => order.organizationId === id);
  const ownCampaigns = campaigns.filter((campaign) => campaign.organizationId === id);

  const pricing = await Promise.all(
    products.map(async (product) => {
      const { breakdown, source } = await resolveAdminPricing({
        product,
        organizationId: id,
        campaignId: summary.activeCampaign?.id ?? null,
      });
      return {
        product,
        price: breakdown.organizationPrice,
        consumerPrice: breakdown.consumerPrice,
        margin: breakdown.organizationMargin,
        source,
      };
    }),
  );

  return {
    ...summary,
    campaigns: ownCampaigns,
    orders: ownOrders,
    activity,
    economics: await economicsForOrders(ownOrders),
    pricing,
  };
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

export interface CampaignSummary {
  campaign: Campaign;
  organization: Organization | null;
  orderedUnits: number;
  unitsPerParticipant: number | null;
  expectedProfit: number;
  orderValue: number;
  orderCount: number;
  /** Share of the target reached, when a target is set. */
  targetProgress: number | null;
}

export async function campaignSummaries(): Promise<CampaignSummary[]> {
  const [campaigns, organizations, orders] = await Promise.all([
    listCampaigns(),
    listOrganizations(),
    listOrders(),
  ]);

  return campaigns
    .map<CampaignSummary>((campaign) => {
      const own = orders.filter(
        (order) => order.campaignId === campaign.id && order.status !== "cancelled",
      );
      const orderedUnits = own.reduce((sum, order) => sum + units(order), 0);
      const expectedProfit = own.reduce((sum, order) => sum + order.organizationProfit, 0);

      return {
        campaign,
        organization:
          organizations.find((org) => org.id === campaign.organizationId) ?? null,
        orderedUnits,
        unitsPerParticipant:
          campaign.participants > 0 && orderedUnits > 0
            ? orderedUnits / campaign.participants
            : null,
        expectedProfit,
        orderValue: own.reduce((sum, order) => sum + order.total, 0),
        orderCount: own.length,
        targetProgress:
          campaign.targetProfit && campaign.targetProfit > 0
            ? expectedProfit / campaign.targetProfit
            : null,
      };
    })
    .sort((a, b) => b.expectedProfit - a.expectedProfit);
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export interface DashboardMetrics {
  activeCampaigns: number;
  unitsOrdered: number;
  orderValue: number;
  organizationProfit: number;
  expectedRevenueExVat: number;
  ordersAwaitingConfirmation: number;
  upcomingDeliveries: Delivery[];
  averageOrderSize: number;
  averageUnitsPerParticipant: number | null;
  orderCount: number;
  organizationCount: number;
  leadCount: number;
  /** Share of organizations that have placed at least one order. */
  conversionRate: number | null;
  economics: InternalEconomics;
  ordersOverTime: { date: string; label: string; orders: number; value: number }[];
  volumePerMonth: { month: string; label: string; units: number }[];
  largestCampaigns: { name: string; organization: string; units: number; profit: number }[];
}

function monthLabel(iso: string): string {
  const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  const [year, month] = iso.split("-");
  const index = Number(month) - 1;
  return `${months[index] ?? month} ${String(year).slice(2)}`;
}

export async function dashboardMetrics(): Promise<DashboardMetrics> {
  const [campaigns, organizations, orders, deliveries, summaries] = await Promise.all([
    listCampaigns(),
    listOrganizations(),
    listOrders(),
    listDeliveries(),
    campaignSummaries(),
  ]);

  const live = orders.filter((order) => order.status !== "cancelled");
  const unitsOrdered = live.reduce((sum, order) => sum + units(order), 0);
  const orderValue = live.reduce((sum, order) => sum + order.total, 0);

  // Orders per day, over the last 30 days that have activity.
  const byDay = new Map<string, { orders: number; value: number }>();
  for (const order of live) {
    const day = String(order.createdAt ?? "").slice(0, 10);
    if (!day) continue;
    const entry = byDay.get(day) ?? { orders: 0, value: 0 };
    entry.orders += 1;
    entry.value += order.total;
    byDay.set(day, entry);
  }

  const byMonth = new Map<string, number>();
  for (const order of live) {
    const month = String(order.createdAt ?? "").slice(0, 7);
    if (!month) continue;
    byMonth.set(month, (byMonth.get(month) ?? 0) + units(order));
  }

  const participantsWithOrders = summaries
    .filter((summary) => summary.orderedUnits > 0)
    .reduce((sum, summary) => sum + summary.campaign.participants, 0);

  const organizationsWithOrders = new Set(live.map((order) => order.organizationId)).size;

  return {
    activeCampaigns: campaigns.filter((c) => OPEN_CAMPAIGN_STATUSES.includes(c.status)).length,
    unitsOrdered,
    orderValue,
    organizationProfit: live.reduce((sum, order) => sum + order.organizationProfit, 0),
    expectedRevenueExVat: live.reduce((sum, order) => sum + order.subtotal, 0),
    ordersAwaitingConfirmation: orders.filter((order) => order.status === "received").length,
    upcomingDeliveries: deliveries
      .filter((delivery) => delivery.status !== "delivered")
      .sort((a, b) =>
        String(a.requestedDate ?? "9999").localeCompare(String(b.requestedDate ?? "9999")),
      )
      .slice(0, 6),
    averageOrderSize: live.length > 0 ? Math.round(unitsOrdered / live.length) : 0,
    averageUnitsPerParticipant:
      participantsWithOrders > 0 ? unitsOrdered / participantsWithOrders : null,
    orderCount: live.length,
    organizationCount: organizations.length,
    leadCount: organizations.filter((org) => org.status === "lead").length,
    conversionRate:
      organizations.length > 0 ? organizationsWithOrders / organizations.length : null,
    economics: await economicsForOrders(live),
    ordersOverTime: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, entry]) => ({
        date,
        label: date.slice(8) + "." + date.slice(5, 7),
        orders: entry.orders,
        value: entry.value,
      })),
    volumePerMonth: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, unitCount]) => ({ month, label: monthLabel(month), units: unitCount })),
    largestCampaigns: summaries
      .filter((summary) => summary.orderedUnits > 0)
      .slice(0, 6)
      .map((summary) => ({
        name: summary.campaign.name,
        organization: summary.organization?.name ?? "—",
        units: summary.orderedUnits,
        profit: summary.expectedProfit,
      })),
  };
}

export { ACTIVE_ORDER_STATUSES };
