import "server-only";
import { toCsv } from "@/lib/csv";
import { oreToDecimalString } from "@/lib/money";
import { getCampaignExportData } from "./campaigns";

export type ExportType = "packing-list" | "delivery-list" | "settlement" | "pickup-status";

export const EXPORT_LABELS: Record<ExportType, string> = {
  "packing-list": "Pakkeliste for lager",
  "delivery-list": "Leveringsliste til kunder",
  settlement: "Økonomisk oppgjør",
  "pickup-status": "Hentestatus per selger",
};

export function isExportType(value: string): value is ExportType {
  return value in EXPORT_LABELS;
}

export async function buildCampaignCsv(campaignId: string, type: ExportType): Promise<{ filename: string; body: string } | null> {
  const data = await getCampaignExportData(campaignId);
  if (!data) return null;
  const base = `${data.campaign.slug || data.campaign.id}-${type}`;

  if (type === "packing-list") {
    const bySeller = new Map<string, { seller: string; team: string; code: string; quantity: number }>();
    for (const row of data.rows) {
      const current = bySeller.get(row.sellerId) ?? {
        seller: row.sellerName,
        team: row.teamName,
        code: row.sellerCode,
        quantity: 0,
      };
      current.quantity += row.quantity;
      bySeller.set(row.sellerId, current);
    }
    const pickupCodes = new Map(data.pickups.map((p) => [p.seller_id as string, p.pickup_code as string]));
    const rows = Array.from(bySeller.entries())
      .sort((a, b) => a[1].team.localeCompare(b[1].team) || a[1].seller.localeCompare(b[1].seller))
      .map(([sellerId, v]) => [v.seller, v.team, v.quantity, pickupCodes.get(sellerId) ?? v.code]);
    const total = rows.reduce((n, r) => n + (r[2] as number), 0);
    rows.push(["TOTALT", "", total, ""]);
    return { filename: `${base}.csv`, body: toCsv(["Selger", "Lag", "Antall", "Hentekode"], rows) };
  }

  // Who has collected and who still has to turn up — the list the club chases
  // people with, and the one they reconcile against their own payment system.
  if (type === "pickup-status") {
    const bySeller = new Map<string, { seller: string; team: string; quantity: number; customers: number }>();
    for (const row of data.rows) {
      const current = bySeller.get(row.sellerId) ?? { seller: row.sellerName, team: row.teamName, quantity: 0, customers: 0 };
      current.quantity += row.quantity;
      current.customers += 1;
      bySeller.set(row.sellerId, current);
    }

    const pickups = new Map(data.pickups.map((p) => [p.seller_id as string, p]));
    const rows = Array.from(bySeller.entries())
      .map(([sellerId, v]) => {
        const pickup = pickups.get(sellerId);
        const collected = pickup?.status === "PICKED_UP";
        return {
          sort: [collected ? 1 : 0, v.team, v.seller] as const,
          line: [
            v.seller,
            v.team,
            v.quantity,
            v.customers,
            pickup?.pickup_code ?? "",
            collected ? "Hentet" : "Ikke hentet",
            pickup?.picked_up_at ? new Date(pickup.picked_up_at as string).toLocaleString("nb-NO") : "",
          ],
        };
      })
      .sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1].localeCompare(b.sort[1]) || a.sort[2].localeCompare(b.sort[2]))
      .map((r) => r.line);

    const waiting = rows.filter((r) => r[5] === "Ikke hentet");
    rows.push([
      "IKKE HENTET",
      "",
      waiting.reduce((n, r) => n + (r[2] as number), 0),
      waiting.length,
      "",
      "",
      "",
    ]);

    return {
      filename: `${base}.csv`,
      body: toCsv(["Selger", "Lag", "Antall", "Kunder", "Hentekode", "Status", "Hentet tidspunkt"], rows),
    };
  }

  if (type === "delivery-list") {
    const rows = data.rows
      .sort((a, b) => a.sellerName.localeCompare(b.sellerName))
      .map((r) => [
        r.sellerName,
        r.teamName,
        r.customerName,
        r.quantity,
        r.customerPhone ?? "",
        r.customerEmail ?? "",
        r.invoiced ? "Faktureres klubben" : "Betalt av kunde",
      ]);
    return {
      filename: `${base}.csv`,
      body: toCsv(["Selger", "Lag", "Kunde", "Antall", "Telefon", "E-post", "Betaling"], rows),
    };
  }

  // settlement — one line per team plus a campaign total
  const byTeam = new Map<
    string,
    { club: string; team: string; quantity: number; gross: number; club_earning: number; sorkyst: number; vat: number; exVat: number }
  >();
  for (const row of data.rows) {
    const current = byTeam.get(row.teamId) ?? {
      club: row.clubName,
      team: row.teamName,
      quantity: 0,
      gross: 0,
      club_earning: 0,
      sorkyst: 0,
      vat: 0,
      exVat: 0,
    };
    current.quantity += row.quantity;
    current.gross += row.grossAmount;
    current.club_earning += row.clubEarningAmount;
    current.sorkyst += row.sorkystAmountIncVat;
    current.vat += row.vatAmount;
    current.exVat += row.sorkystRevenueExVat;
    byTeam.set(row.teamId, current);
  }

  const teamRows = Array.from(byTeam.values()).sort((a, b) => a.team.localeCompare(b.team));
  const rows = teamRows.map((t) => [
    t.club,
    t.team,
    t.quantity,
    oreToDecimalString(t.gross),
    oreToDecimalString(t.club_earning),
    oreToDecimalString(t.sorkyst),
    oreToDecimalString(t.vat),
    oreToDecimalString(t.exVat),
  ]);

  const total = teamRows.reduce(
    (acc, t) => ({
      quantity: acc.quantity + t.quantity,
      gross: acc.gross + t.gross,
      club_earning: acc.club_earning + t.club_earning,
      sorkyst: acc.sorkyst + t.sorkyst,
      vat: acc.vat + t.vat,
      exVat: acc.exVat + t.exVat,
    }),
    { quantity: 0, gross: 0, club_earning: 0, sorkyst: 0, vat: 0, exVat: 0 },
  );

  rows.push([
    data.clubName,
    "TOTALT",
    total.quantity,
    oreToDecimalString(total.gross),
    oreToDecimalString(total.club_earning),
    oreToDecimalString(total.sorkyst),
    oreToDecimalString(total.vat),
    oreToDecimalString(total.exVat),
  ]);

  return {
    filename: `${base}.csv`,
    body: toCsv(
      [
        "Klubb",
        "Lag",
        "Antall",
        "Bruttosalg",
        "Klubbandel",
        "SØRKYST inkl. mva",
        "Mva",
        "SØRKYST eks. mva",
        "Betalingsmodell",
      ],
      rows.map((row) => [...row, data.campaign.payment_mode === "INVOICE" ? "Faktura til klubb" : "Kunden betaler online"]),
    ),
  };
}
