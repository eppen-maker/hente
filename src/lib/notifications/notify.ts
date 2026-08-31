import "server-only";

import { aggregateEconomics, unitEconomics } from "@/lib/admin/economics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

/**
 * Internal notification when an order arrives.
 *
 * An order that lands in the database without anyone being told is an order
 * nobody acts on. This sends to whichever channels are configured — SMTP,
 * Resend, and/or a Slack webhook — and does nothing but log when none are.
 *
 * The order mail carries our own cost and margin, so the recipient list
 * (NOTIFICATION_EMAIL) is internal by definition: never point it at a club.
 *
 * It never throws: a club's order must not fail because a mail provider is
 * having a bad day.
 */

export interface OrderNotification {
  orderNumber: string;
  organizationName: string;
  campaignName?: string | null;
  contactName: string;
  email: string;
  phone?: string | null;
  productName: string;
  /** Article number, so the purchase order can be placed without a lookup. */
  sku?: string | null;
  quantity: number;
  participants: number;
  total: number;
  organizationProfit: number;
  requestedDeliveryDate?: string | null;
  notes?: string | null;

  /**
   * INTERNAL. Inputs for our own margin, not the club's. Present so the
   * notification can answer "what do we make on this" without a trip to the
   * CRM — which means this mail must only ever go to NOTIFICATION_EMAIL.
   */
  unitPrice: number;
  consumerPrice: number;
  organizationMargin: number;
  vatRate: number;
  /** Our landed cost per unit, ex VAT. Null when nobody has entered it yet. */
  landedCostExVat?: number | null;
}

export type NotificationChannel = "smtp" | "resend" | "slack" | "log";

export interface NotificationResult {
  channel: NotificationChannel;
  ok: boolean;
  detail?: string;
}

/** Outbound calls get a short leash so a slow provider cannot stall the order. */
const TIMEOUT_MS = 6_000;

/** Who gets told. Comma-separated, same list for orders and enquiries. */
function recipients(): string[] {
  const raw =
    process.env.NOTIFICATION_EMAIL ?? process.env.ORDER_NOTIFICATION_EMAIL ?? "";
  return raw
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * The body of the order mail, written for the person who has to act on it:
 * what to purchase first, what we make on it second, the club and the contact
 * details last.
 */
function lines(order: OrderNotification): string[] {
  const economics = aggregateEconomics([
    {
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      organizationMargin: order.organizationMargin,
      vatRate: order.vatRate,
      landedCostExVat: order.landedCostExVat ?? null,
    },
  ]);

  const unit = unitEconomics(
    { vatRate: order.vatRate, landedCostExVat: order.landedCostExVat ?? null },
    {
      consumerPrice: order.consumerPrice,
      organizationPrice: order.unitPrice,
      organizationMargin: order.organizationMargin,
    },
  );

  return [
    "BESTILL INN",
    `${order.productName}${order.sku ? ` (${order.sku})` : ""}`,
    `Antall: ${formatNumber(order.quantity)} stk`,
    order.requestedDeliveryDate
      ? `Ønsket levering: ${order.requestedDeliveryDate}`
      : null,

    "",
    "VÅR ØKONOMI",
    `Vi fakturerer klubben (eks. mva.): ${formatCurrency(economics.revenueExVat)}`,
    economics.cogs == null
      ? "Vår varekost: IKKE SATT — legg inn kostpris på /admin/produkter, så regnes fortjenesten ut her."
      : `Vår varekost (eks. mva.): ${formatCurrency(economics.cogs)}`,
    economics.grossProfit == null
      ? null
      : `Vi tjener: ${formatCurrency(economics.grossProfit)}${
          economics.grossMargin == null
            ? ""
            : ` (${formatPercent(economics.grossMargin)} margin)`
        }`,
    unit.grossProfitPerUnit == null
      ? null
      : `Per enhet: ${formatCurrency(unit.revenueExVat, { decimals: 2 })} inn − ${formatCurrency(
          unit.landedCostExVat ?? 0,
          { decimals: 2 },
        )} kost = ${formatCurrency(unit.grossProfitPerUnit, { decimals: 2 })}`,

    "",
    "KLUBBEN",
    `Organisasjon: ${order.organizationName}`,
    order.campaignName ? `Dugnad: ${order.campaignName}` : null,
    `Deltakere: ${formatNumber(order.participants)}`,
    `Klubben betaler (inkl. mva.): ${formatCurrency(order.total)}`,
    `Klubben tjener: ${formatCurrency(order.organizationProfit)}`,

    "",
    "KONTAKT",
    order.contactName,
    order.email,
    order.phone ? order.phone : null,
    order.notes ? `\nMelding fra klubben:\n${order.notes}` : null,
  ].filter((line): line is string => line !== null);
}

async function post(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * SMTP — sends through an existing mailbox (Gmail, iCloud, anything with an
 * app password). No new service to sign up for, and it reaches any recipient.
 */
async function sendSmtp(
  subject: string,
  body: string,
  replyTo?: string,
): Promise<NotificationResult | null> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const to = recipients();
  if (!host || !user || !pass || to.length === 0) return null;

  const { createTransport } = await import("nodemailer");
  const transport = createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `SØRKYST <${user}>`,
    to,
    replyTo,
    subject,
    text: body,
  });

  return { channel: "smtp", ok: true };
}

async function sendResend(
  subject: string,
  body: string,
  replyTo?: string,
): Promise<NotificationResult | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = recipients();
  if (!apiKey || to.length === 0) return null;

  const response = await post("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Resend's shared sender works without domain verification, but only
      // delivers to the account owner's own address.
      from: process.env.ORDER_NOTIFICATION_FROM ?? "SØRKYST <onboarding@resend.dev>",
      to,
      reply_to: replyTo,
      subject,
      text: body,
    }),
  });

  if (response.ok) return { channel: "resend", ok: true };
  return {
    channel: "resend",
    ok: false,
    detail: `${response.status} ${await response.text().catch(() => "")}`.slice(0, 300),
  };
}

async function sendSlack(
  subject: string,
  body: string,
): Promise<NotificationResult | null> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return null;

  const response = await post(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `*${subject}*\n\`\`\`${body}\`\`\`` }),
  });

  return response.ok
    ? { channel: "slack", ok: true }
    : { channel: "slack", ok: false, detail: String(response.status) };
}

/**
 * Tries every configured channel. Never throws, and says so loudly in the log
 * when nothing is configured rather than pretending someone was told.
 */
async function dispatch(
  label: string,
  subject: string,
  body: string,
  replyTo?: string,
): Promise<NotificationResult[]> {
  const senders: Array<[NotificationChannel, () => Promise<NotificationResult | null>]> = [
    ["smtp", () => sendSmtp(subject, body, replyTo)],
    ["resend", () => sendResend(subject, body, replyTo)],
    ["slack", () => sendSlack(subject, body)],
  ];

  const results: NotificationResult[] = [];
  for (const [channel, send] of senders) {
    try {
      const result = await send();
      if (result) results.push(result);
    } catch (error) {
      results.push({
        channel,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (results.length === 0) {
    console.warn(`${label} — ingen varslingskanal er konfigurert.`);
    return [{ channel: "log", ok: true, detail: "ingen kanal konfigurert" }];
  }

  for (const result of results.filter((r) => !r.ok)) {
    console.error(`Varsling via ${result.channel} feilet: ${result.detail}`);
  }

  return results;
}

export async function notifyNewOrder(
  order: OrderNotification,
): Promise<NotificationResult[]> {
  const { grossProfit } = aggregateEconomics([
    {
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      organizationMargin: order.organizationMargin,
      vatRate: order.vatRate,
      landedCostExVat: order.landedCostExVat ?? null,
    },
  ]);

  // The subject line answers the two questions worth answering at a glance:
  // how much to order, and what it leaves us.
  const headline =
    grossProfit == null
      ? `${formatNumber(order.quantity)} stk`
      : `${formatNumber(order.quantity)} stk, ${formatCurrency(grossProfit)} til oss`;

  const subject = `Ny bestilling ${order.orderNumber} — ${order.organizationName} (${headline})`;

  return dispatch(
    `Ny bestilling ${order.orderNumber} (${order.organizationName})`,
    subject,
    lines(order).join("\n"),
    order.email,
  );
}

/** An enquiry from the "Start en dugnad" form. */
export interface LeadNotification {
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  participantCount: number;
  estimatedProducts?: number | null;
  estimatedProfit?: number | null;
  message?: string | null;
  source: string;
}

export async function notifyNewLead(
  lead: LeadNotification,
): Promise<NotificationResult[]> {
  const body = [
    `Organisasjon: ${lead.organizationName}`,
    `Kontakt: ${lead.contactName}`,
    `E-post: ${lead.email}`,
    lead.phone ? `Telefon: ${lead.phone}` : null,
    lead.city ? `Sted: ${lead.city}` : null,
    `Deltakere: ${formatNumber(lead.participantCount)}`,
    lead.estimatedProducts
      ? `Anslag produkter: ${formatNumber(lead.estimatedProducts)}`
      : null,
    lead.estimatedProfit
      ? `Anslag til klubben: ${formatCurrency(lead.estimatedProfit)}`
      : null,
    `Kom fra: ${lead.source}`,
    lead.message ? `\nMelding:\n${lead.message}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return dispatch(
    `Ny henvendelse fra ${lead.organizationName}`,
    `Ny dugnadshenvendelse — ${lead.organizationName}`,
    body,
    lead.email,
  );
}
