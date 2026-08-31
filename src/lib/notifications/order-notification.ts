import "server-only";

import { formatCurrency, formatNumber } from "@/lib/format";

/**
 * Internal notification when an order arrives.
 *
 * An order that lands in the database without anyone being told is an order
 * nobody acts on. This sends to whichever channels are configured — e-mail via
 * Resend, and/or a Slack webhook — and does nothing but log when none are.
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
  quantity: number;
  participants: number;
  total: number;
  organizationProfit: number;
  requestedDeliveryDate?: string | null;
  notes?: string | null;
}

export type NotificationChannel = "resend" | "slack" | "log";

export interface NotificationResult {
  channel: NotificationChannel;
  ok: boolean;
  detail?: string;
}

/** Outbound calls get a short leash so a slow provider cannot stall the order. */
const TIMEOUT_MS = 6_000;

function lines(order: OrderNotification): string[] {
  return [
    `Ordrenummer: ${order.orderNumber}`,
    `Organisasjon: ${order.organizationName}`,
    order.campaignName ? `Dugnad: ${order.campaignName}` : null,
    "",
    `Produkt: ${order.productName}`,
    `Antall: ${formatNumber(order.quantity)}`,
    `Deltakere: ${formatNumber(order.participants)}`,
    `Ordreverdi inkl. mva.: ${formatCurrency(order.total)}`,
    `Til klubben: ${formatCurrency(order.organizationProfit)}`,
    "",
    `Kontakt: ${order.contactName}`,
    `E-post: ${order.email}`,
    order.phone ? `Telefon: ${order.phone}` : null,
    order.requestedDeliveryDate
      ? `Ønsket levering: ${order.requestedDeliveryDate}`
      : null,
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

async function sendEmail(order: OrderNotification): Promise<NotificationResult | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return null;

  const body = lines(order).join("\n");

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
      to: to.split(",").map((address) => address.trim()),
      reply_to: order.email,
      subject: `Ny bestilling ${order.orderNumber} — ${order.organizationName} (${formatCurrency(
        order.organizationProfit,
      )} til klubben)`,
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

async function sendSlack(order: OrderNotification): Promise<NotificationResult | null> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return null;

  const response = await post(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*Ny bestilling ${order.orderNumber}* — ${order.organizationName}\n\`\`\`${lines(
        order,
      ).join("\n")}\`\`\``,
    }),
  });

  return response.ok
    ? { channel: "slack", ok: true }
    : { channel: "slack", ok: false, detail: String(response.status) };
}

export async function notifyNewOrder(
  order: OrderNotification,
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const send of [sendEmail, sendSlack]) {
    try {
      const result = await send(order);
      if (result) results.push(result);
    } catch (error) {
      results.push({
        channel: send === sendEmail ? "resend" : "slack",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (results.length === 0) {
    // Nothing configured. The order is safe in the database, but say so loudly
    // in the log rather than pretending someone was told.
    console.warn(
      `Ny bestilling ${order.orderNumber} (${order.organizationName}) — ingen varslingskanal er konfigurert.`,
    );
    return [{ channel: "log", ok: true, detail: "ingen kanal konfigurert" }];
  }

  for (const result of results.filter((r) => !r.ok)) {
    console.error(`Varsling via ${result.channel} feilet: ${result.detail}`);
  }

  return results;
}
