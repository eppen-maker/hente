import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/db";
import type { Company, FinancialYear } from "@/lib/types";

const COLORS = ["#2a78d6", "#1baf7a", "#eb6834", "#4a3aa7", "#0f3d2e", "#5b6b7d"];

const numOrNull = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, string>;
  if (!body.name?.trim()) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  const id = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || uid("co");

  const now = new Date().toISOString();
  const year = numOrNull(body.fyYear);
  const financials: FinancialYear[] = year
    ? [
        {
          year,
          revenue: numOrNull(body.fyRevenue),
          ebitda: numOrNull(body.fyEbitda),
          operatingProfit: null,
          netIncome: numOrNull(body.fyNetIncome),
          equity: numOrNull(body.fyEquity),
          totalAssets: numOrNull(body.fyTotalAssets),
          debt: numOrNull(body.fyDebt),
          cash: numOrNull(body.fyCash),
          employees: numOrNull(body.fyEmployees),
          source: body.fySource?.trim() || "Manual entry",
          period: `FY${year}`,
          updatedAt: now,
        },
      ]
    : [];

  const initials = body.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const company: Company = {
    id,
    name: body.name.trim(),
    logoText: initials || "··",
    logoColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    orgNr: body.orgNr?.trim() || null,
    ticker: body.ticker?.trim() || null,
    sector: body.sector || "Technology",
    industry: body.industry?.trim() || "—",
    location: body.location?.trim() || "—",
    country: "NO",
    website: body.website?.trim() || null,
    description: body.description?.trim() || "",
    listing: body.listing === "LISTED" ? "LISTED" : "UNLISTED",
    status: (body.status as Company["status"]) || "WATCHLIST",
    stage: body.listing === "LISTED" ? "PUBLIC" : "VENTURE",
    currency: "NOK",
    foundedYear: null,
    employeesLatest: numOrNull(body.fyEmployees),
    management: [],
    financials,
    valuation: {
      latestValuation: numOrNull(body.latestValuation),
      entryValuation: null,
      sharePrice: null,
      sharesOutstanding: null,
      netDebt: null,
      comparableEvEbitda: null,
      comparableEvRevenue: null,
      source: body.valuationSource?.trim() || "Manual entry",
      period: now.slice(0, 7),
      updatedAt: now,
    },
    scenarios: {
      downside: { revenueGrowth: 0.05, ebitdaMargin: 0.08, exitYear: new Date().getFullYear() + 5, exitMultiple: 5, exitBasis: "EBITDA", dilution: 0.2, futureCapitalNeed: 0 },
      base: { revenueGrowth: 0.2, ebitdaMargin: 0.15, exitYear: new Date().getFullYear() + 5, exitMultiple: 9, exitBasis: "EBITDA", dilution: 0.15, futureCapitalNeed: 0 },
      upside: { revenueGrowth: 0.32, ebitdaMargin: 0.22, exitYear: new Date().getFullYear() + 5, exitMultiple: 12, exitBasis: "EBITDA", dilution: 0.12, futureCapitalNeed: 0 },
    },
    thesis: { ourText: "", updatedAt: now },
    capTable: [],
    fundingRounds: [],
    timeline: [{ date: now.slice(0, 10), type: "IDENTIFIED", title: "Registered in the system" }],
    updates: [],
    documents: [],
    qualitative: {
      businessModel: "",
      customers: "",
      moat: [],
      growthDrivers: [],
      risks: [],
      catalysts: [],
      missingInformation: [],
    },
  };

  mutate((store) => {
    if (store.companies.some((c) => c.id === company.id)) company.id = uid("co");
    store.companies.push(company);
  });

  return NextResponse.json({ id: company.id });
}
