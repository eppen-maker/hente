/**
 * Domain model for the Investment Intelligence system.
 *
 * Data quality is a first class concept. Every number in the system belongs to
 * exactly one of four classes and the UI must never blur them:
 *
 *   RAW        – reported figures (annual accounts, market data, filings)
 *   CALCULATED – derived deterministically from raw data (CAGR, margins, ratios)
 *   ASSUMPTION – entered by us (growth, exit multiple, dilution)
 *   AI          – interpretation produced from raw + calculated data
 */
export type DataClass = "RAW" | "CALCULATED" | "ASSUMPTION" | "AI";

export type CompanyStatus =
  | "PORTFOLIO"
  | "WATCHLIST"
  | "DUE_DILIGENCE"
  | "MONITORING"
  | "PASSED";

export type Listing = "LISTED" | "UNLISTED";

/** Where a raw data point came from. Always stored next to the value. */
export interface Provenance {
  source: string;
  period: string;
  updatedAt: string;
}

/** One reported financial year. `null` means DATA UNAVAILABLE – never guessed. */
export interface FinancialYear extends Provenance {
  year: number;
  revenue: number | null;
  ebitda: number | null;
  operatingProfit: number | null;
  netIncome: number | null;
  equity: number | null;
  totalAssets: number | null;
  debt: number | null;
  cash: number | null;
  employees: number | null;
}

export interface ValuationData extends Provenance {
  /** Latest known valuation / market cap of the whole equity. */
  latestValuation: number | null;
  /** Valuation at which we entered (unlisted) – null if we have not invested. */
  entryValuation: number | null;
  sharePrice: number | null;
  sharesOutstanding: number | null;
  netDebt: number | null;
  /** Manually maintained comparable set multiples (assumptions). */
  comparableEvEbitda: number | null;
  comparableEvRevenue: number | null;
}

export type ExitBasis = "EBITDA" | "REVENUE";

/** USER ASSUMPTIONS. Never presented as fact. */
export interface ScenarioAssumptions {
  revenueGrowth: number; // annual %, e.g. 0.25
  ebitdaMargin: number; // e.g. 0.18
  exitYear: number;
  exitMultiple: number;
  exitBasis: ExitBasis;
  dilution: number; // total dilution until exit, e.g. 0.15
  futureCapitalNeed: number; // NOK
  note?: string;
}

export interface ScenarioSet {
  downside: ScenarioAssumptions;
  base: ScenarioAssumptions;
  upside: ScenarioAssumptions;
}

export type ScenarioKey = keyof ScenarioSet;

export interface Shareholder {
  name: string;
  shares: number;
  isUs?: boolean;
}

export interface FundingRound {
  date: string;
  name: string;
  preMoney: number | null;
  raised: number | null;
  note?: string;
}

export interface TimelineEvent {
  date: string;
  type:
    | "FOUNDED"
    | "IDENTIFIED"
    | "MEETING"
    | "DUE_DILIGENCE"
    | "DECISION"
    | "INVESTMENT"
    | "FUNDING_ROUND"
    | "REPORT"
    | "CONTRACT"
    | "MANAGEMENT"
    | "FOLLOW_ON"
    | "EXIT"
    | "OTHER";
  title: string;
  detail?: string;
}

export interface CompanyUpdate {
  date: string;
  kind:
    | "ANNUAL_REPORT"
    | "QUARTERLY_REPORT"
    | "REVENUE"
    | "MARGIN"
    | "DEBT"
    | "CAPITAL_RAISE"
    | "OWNERSHIP"
    | "MANAGEMENT"
    | "ANNOUNCEMENT"
    | "SHARE_PRICE";
  title: string;
  detail?: string;
  source: string;
}

export interface CompanyDocument {
  id: string;
  name: string;
  type:
    | "ANNUAL_REPORT"
    | "INVESTOR_PRESENTATION"
    | "PITCH_DECK"
    | "BUDGET"
    | "FINANCIAL_MODEL"
    | "SHAREHOLDER_AGREEMENT"
    | "BOARD_PRESENTATION"
    | "QUARTERLY_REPORT";
  period: string;
  uploadedAt: string;
  pages: number | null;
  /** Extracted, source-referenced statements. Empty until a document is parsed. */
  extracts: { page: number; text: string }[];
}

export interface Manager {
  name: string;
  role: string;
  background?: string;
}

export interface InvestmentThesis {
  /** Our own words. AI must never overwrite this. */
  ourText: string;
  updatedAt: string;
  structured?: {
    whyNow: string;
    marketOpportunity: string;
    competitiveAdvantage: string;
    growthDrivers: string;
    scalability: string;
    management: string;
    catalysts: string;
    keyRisks: string;
    generatedAt: string;
  };
}

export interface Company {
  id: string;
  name: string;
  logoText: string;
  logoColor: string;
  orgNr: string | null;
  ticker: string | null;
  sector: string;
  industry: string;
  location: string;
  country: string;
  website: string | null;
  description: string;
  listing: Listing;
  status: CompanyStatus;
  stage: "SEED" | "VENTURE" | "GROWTH" | "BUYOUT" | "PUBLIC";
  currency: "NOK";
  foundedYear: number | null;
  employeesLatest: number | null;
  management: Manager[];
  financials: FinancialYear[];
  valuation: ValuationData;
  scenarios: ScenarioSet;
  thesis: InvestmentThesis;
  capTable: Shareholder[];
  fundingRounds: FundingRound[];
  timeline: TimelineEvent[];
  updates: CompanyUpdate[];
  documents: CompanyDocument[];
  /** Qualitative inputs used by the analysis engine. Facts we have registered. */
  qualitative: {
    businessModel: string;
    customers: string;
    moat: string[];
    growthDrivers: string[];
    risks: string[];
    catalysts: string[];
    missingInformation: string[];
  };
}

export type Structure = "DIRECT" | "VEHICLE";

export interface Investor {
  id: string;
  name: string;
  role: string;
  email: string | null;
  joinedAt: string;
  availableCapital: number;
  committedCapital: number;
  /** Ownership of the investment vehicle (Investment AS), 0–1. */
  vehicleOwnership: number;
  vehicleEquityContribution: number;
  vehicleShareholderLoan: number;
}

export interface Vehicle {
  name: string;
  orgNr: string | null;
  /** Capital held by the vehicle itself, available for new investments. */
  availableCapital: number;
}

export interface AllocationLine {
  investorId: string;
  amount: number;
}

export interface Investment {
  id: string;
  companyId: string;
  date: string;
  amount: number;
  entryValuation: number;
  /** Equity share acquired by this investment, 0–1. */
  ownershipPct: number;
  /** DIRECT: investors own the shares. VEHICLE: Investment AS owns the shares. */
  structure: Structure;
  /** Only used for DIRECT investments. */
  allocations: AllocationLine[];
  type: "INITIAL" | "FOLLOW_ON";
  instrument: "EQUITY" | "SHAREHOLDER_LOAN" | "CONVERTIBLE";
  note?: string;
  /** Frozen investment case, written at the time of the decision. */
  snapshot?: InvestmentSnapshot;
}

export interface InvestmentSnapshot {
  createdAt: string;
  investmentDate: string;
  amount: number;
  entryValuation: number;
  ownershipPct: number;
  revenueAtEntry: number | null;
  ebitdaAtEntry: number | null;
  thesisAtEntry: string;
  assumptions: ScenarioSet;
}

export interface Memo {
  id: string;
  companyId: string;
  title: string;
  createdAt: string;
  /** Rendered markdown snapshot – frozen at generation time. */
  body: string;
}

export interface AlertRule {
  id: string;
  companyId: string | null;
  kind: CompanyUpdate["kind"];
  threshold: number | null;
  enabled: boolean;
  channel: "IN_APP" | "EMAIL";
  description: string;
}

export interface LabPosition {
  companyId: string;
  amount: number;
}

export interface ScenarioLabState {
  totalCapital: number;
  positions: LabPosition[];
  updatedAt: string;
}

export interface Store {
  meta: {
    fundName: string;
    baseCurrency: "NOK";
    /** Capital committed to the platform in total (all investors). */
    seededAt: string;
    version: number;
  };
  vehicle: Vehicle;
  companies: Company[];
  investors: Investor[];
  investments: Investment[];
  memos: Memo[];
  alerts: AlertRule[];
  lab: ScenarioLabState;
  /** Capital set aside for follow-on rounds in existing positions. */
  reserves: { companyId: string; amount: number }[];
}
