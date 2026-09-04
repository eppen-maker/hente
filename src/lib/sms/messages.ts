/**
 * SMS templates. Pure functions with no I/O, so the wording is unit-testable
 * and lives next to the provider rather than inside a server-only module.
 */
import { formatOre } from "@/lib/money";
import { brand } from "@/brand/brand.config";

export interface OrderNotificationContext {
  orderId: string;
  quantity: number;
  grossAmount: number;
  clubEarningAmount: number;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string | null;
  sellerId: string;
  sellerFirstName: string;
  sellerLastName: string;
  sellerPhone: string | null;
  sellerTotal: number;
  teamName: string;
  clubName: string;
  campaignName: string;
  paymentMode: "ONLINE" | "INVOICE";
  pickupLocation: string | null;
  pickupCode: string | null;
}

/** Receipt sent to the customer who ordered. */
export function customerReceipt(c: OrderNotificationContext): string {
  const what = `${c.quantity} × ${brand.product.shortName} ${brand.product.volume}`;
  const paid =
    c.paymentMode === "INVOICE"
      ? `Bestillingen er registrert (${formatOre(c.grossAmount)}). ${c.clubName} fakturerer.`
      : `Betalt ${formatOre(c.grossAmount)}.`;

  return [
    `Takk for støtten til ${c.teamName}!`,
    `${what}. ${paid}`,
    `${formatOre(c.clubEarningAmount)} går til laget.`,
    `${c.sellerFirstName} ${c.sellerLastName} leverer varene når dugnaden er ferdig.`,
    `— ${brand.name}`,
  ].join(" ");
}

/** Running summary sent to the seller: who bought how many. */
export function sellerNotification(c: OrderNotificationContext): string {
  return [
    `Ny bestilling: ${c.customerName} kjøpte ${c.quantity} stk.`,
    `Du har nå solgt ${c.sellerTotal} totalt for ${c.teamName}.`,
    c.pickupCode ? `Hentekode: ${c.pickupCode}.` : "",
    `— ${brand.name}`,
  ]
    .filter(Boolean)
    .join(" ");
}

