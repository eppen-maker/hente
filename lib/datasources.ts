import type { Company, FinancialYear } from "./types";

/**
 * Data abstraction layer.
 *
 * External providers are not implemented yet. Everything in the application
 * reads through this interface, so connecting Brønnøysundregistrene, Proff or a
 * market data feed later is a matter of implementing `CompanyDataSource` and
 * registering it — no page or component needs to change.
 */

export type SourceStatus = "CONNECTED" | "NOT_CONFIGURED" | "PLANNED";

export interface CompanyProfileResult {
  name: string;
  orgNr: string | null;
  sector: string | null;
  location: string | null;
  foundedYear: number | null;
}

export interface MarketQuote {
  ticker: string;
  price: number;
  currency: string;
  asOf: string;
}

export interface CompanyDataSource {
  id: string;
  name: string;
  kind: "REGISTRY" | "MARKET" | "FILINGS" | "MANUAL";
  status: SourceStatus;
  coverage: string;
  /** Docs or API base, for whoever wires it up later. */
  endpoint?: string;
  fetchProfile?(identifier: string): Promise<CompanyProfileResult>;
  fetchFinancials?(identifier: string): Promise<FinancialYear[]>;
  fetchQuote?(ticker: string): Promise<MarketQuote>;
}

/** Everything currently in the system was entered or imported manually. */
export const manualSource: CompanyDataSource = {
  id: "manual",
  name: "Manual entry / imported accounts",
  kind: "MANUAL",
  status: "CONNECTED",
  coverage: "All companies registered in the system",
};

export const brregSource: CompanyDataSource = {
  id: "brreg",
  name: "Brønnøysundregistrene",
  kind: "REGISTRY",
  status: "NOT_CONFIGURED",
  coverage: "Norwegian company master data and filed annual accounts",
  endpoint: "https://data.brreg.no/enhetsregisteret/api",
};

export const proffSource: CompanyDataSource = {
  id: "proff",
  name: "Proff API / Proff MCP",
  kind: "REGISTRY",
  status: "NOT_CONFIGURED",
  coverage: "Norwegian financial history, roles and ownership",
};

export const marketSource: CompanyDataSource = {
  id: "market",
  name: "Market data (Oslo Børs)",
  kind: "MARKET",
  status: "NOT_CONFIGURED",
  coverage: "Share prices, market cap and announcements for listed holdings",
};

export const filingsSource: CompanyDataSource = {
  id: "filings",
  name: "Annual & quarterly reports",
  kind: "FILINGS",
  status: "PLANNED",
  coverage: "PDF reports uploaded to the Documents section, parsed with page references",
};

export const dataSources: CompanyDataSource[] = [
  manualSource,
  brregSource,
  proffSource,
  marketSource,
  filingsSource,
];

/** Which source a company's figures currently come from. */
export function sourcesFor(company: Company): string[] {
  const s = new Set<string>();
  company.financials.forEach((f) => s.add(f.source));
  if (company.valuation.source) s.add(company.valuation.source);
  return Array.from(s);
}
