import type {
  Company,
  FinancialYear,
  ScenarioAssumptions,
  ScenarioKey,
  ScenarioSet,
} from "./types";

/* ------------------------------------------------------------------ *
 * Primitives                                                          *
 * ------------------------------------------------------------------ */

export const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function safeDiv(a: number | null, b: number | null): number | null {
  if (!isNum(a) || !isNum(b) || b === 0) return null;
  return a / b;
}

/** Compound annual growth rate between two points, `years` apart. */
export function cagr(
  first: number | null,
  last: number | null,
  years: number,
): number | null {
  if (!isNum(first) || !isNum(last) || years <= 0) return null;
  if (first <= 0 || last <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}

export function growth(prev: number | null, curr: number | null): number | null {
  if (!isNum(prev) || !isNum(curr) || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

/** IRR for a single outflow at t=0 and a single inflow at t=years. */
export function simpleIrr(
  invested: number,
  exitValue: number,
  years: number,
): number | null {
  if (invested <= 0 || years <= 0 || exitValue < 0) return null;
  if (exitValue === 0) return -1;
  return Math.pow(exitValue / invested, 1 / years) - 1;
}

/** IRR for an arbitrary annual cash-flow series, solved by bisection. */
export function irr(cashflows: number[], guessLow = -0.99, guessHigh = 10): number | null {
  const npv = (rate: number) =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = guessLow;
  let hi = guessHigh;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export const moic = (invested: number, value: number): number | null =>
  invested > 0 ? value / invested : null;

/* ------------------------------------------------------------------ *
 * Financial history (CALCULATED metrics)                              *
 * ------------------------------------------------------------------ */

export interface DerivedYear extends FinancialYear {
  revenueGrowth: number | null;
  ebitdaMargin: number | null;
  netMargin: number | null;
  equityRatio: number | null;
  roe: number | null;
  netDebt: number | null;
  revenuePerEmployee: number | null;
}

export function deriveYears(financials: FinancialYear[]): DerivedYear[] {
  const sorted = [...financials].sort((a, b) => a.year - b.year);
  return sorted.map((fy, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    return {
      ...fy,
      revenueGrowth: prev ? growth(prev.revenue, fy.revenue) : null,
      ebitdaMargin: safeDiv(fy.ebitda, fy.revenue),
      netMargin: safeDiv(fy.netIncome, fy.revenue),
      equityRatio: safeDiv(fy.equity, fy.totalAssets),
      roe: safeDiv(fy.netIncome, fy.equity),
      netDebt: isNum(fy.debt) && isNum(fy.cash) ? fy.debt - fy.cash : null,
      revenuePerEmployee: safeDiv(fy.revenue, fy.employees),
    };
  });
}

export const latestYear = (c: Company): DerivedYear | null => {
  const d = deriveYears(c.financials);
  return d.length ? d[d.length - 1] : null;
};

export interface HistorySummary {
  years: number;
  firstYear: number | null;
  lastYear: number | null;
  revenueCagr: number | null;
  ebitdaCagr: number | null;
  employeeCagr: number | null;
  marginFirst: number | null;
  marginLast: number | null;
  debtFirst: number | null;
  debtLast: number | null;
  revenuePerEmployeeFirst: number | null;
  revenuePerEmployeeLast: number | null;
  revenueFirst: number | null;
  revenueLast: number | null;
  ebitdaFirst: number | null;
  ebitdaLast: number | null;
}

export function summariseHistory(financials: FinancialYear[]): HistorySummary {
  const d = deriveYears(financials);
  if (d.length === 0) {
    return {
      years: 0,
      firstYear: null,
      lastYear: null,
      revenueCagr: null,
      ebitdaCagr: null,
      employeeCagr: null,
      marginFirst: null,
      marginLast: null,
      debtFirst: null,
      debtLast: null,
      revenuePerEmployeeFirst: null,
      revenuePerEmployeeLast: null,
      revenueFirst: null,
      revenueLast: null,
      ebitdaFirst: null,
      ebitdaLast: null,
    };
  }
  const a = d[0];
  const b = d[d.length - 1];
  const span = b.year - a.year;
  return {
    years: span,
    firstYear: a.year,
    lastYear: b.year,
    revenueCagr: cagr(a.revenue, b.revenue, span),
    ebitdaCagr: cagr(a.ebitda, b.ebitda, span),
    employeeCagr: cagr(a.employees, b.employees, span),
    marginFirst: a.ebitdaMargin,
    marginLast: b.ebitdaMargin,
    debtFirst: a.debt,
    debtLast: b.debt,
    revenuePerEmployeeFirst: a.revenuePerEmployee,
    revenuePerEmployeeLast: b.revenuePerEmployee,
    revenueFirst: a.revenue,
    revenueLast: b.revenue,
    ebitdaFirst: a.ebitda,
    ebitdaLast: b.ebitda,
  };
}

/* ------------------------------------------------------------------ *
 * Valuation (CALCULATED from raw + assumptions)                       *
 * ------------------------------------------------------------------ */

export interface ValuationMetrics {
  marketCap: number | null;
  enterpriseValue: number | null;
  pe: number | null;
  evEbitda: number | null;
  evRevenue: number | null;
  priceSales: number | null;
  priceBook: number | null;
  fcfYield: number | null;
}

export function valuationMetrics(c: Company): ValuationMetrics {
  const fy = latestYear(c);
  const v = c.valuation;
  const marketCap =
    isNum(v.sharePrice) && isNum(v.sharesOutstanding)
      ? v.sharePrice * v.sharesOutstanding
      : v.latestValuation;
  const netDebt = isNum(v.netDebt)
    ? v.netDebt
    : fy && isNum(fy.debt) && isNum(fy.cash)
      ? fy.debt - fy.cash
      : null;
  const ev = isNum(marketCap) && isNum(netDebt) ? marketCap + netDebt : marketCap;
  // Approximated free cash flow: EBITDA less an estimated 25% tax/capex drag.
  const approxFcf = fy && isNum(fy.ebitda) ? fy.ebitda * 0.75 : null;
  return {
    marketCap,
    enterpriseValue: ev,
    pe: fy ? safeDiv(marketCap, fy.netIncome) : null,
    evEbitda: fy ? safeDiv(ev, fy.ebitda) : null,
    evRevenue: fy ? safeDiv(ev, fy.revenue) : null,
    priceSales: fy ? safeDiv(marketCap, fy.revenue) : null,
    priceBook: fy ? safeDiv(marketCap, fy.equity) : null,
    fcfYield: safeDiv(approxFcf, marketCap),
  };
}

/* ------------------------------------------------------------------ *
 * Scenarios (USER ASSUMPTIONS → sensitivity, never a forecast)        *
 * ------------------------------------------------------------------ */

export interface ScenarioResult {
  key: ScenarioKey;
  years: number;
  futureRevenue: number | null;
  futureEbitda: number | null;
  companyValue: number | null;
  ownershipAtExit: number;
  valueOfPosition: number | null;
  profit: number | null;
  moic: number | null;
  irr: number | null;
}

export const SCENARIO_KEYS: ScenarioKey[] = ["downside", "base", "upside"];

export function projectScenario(
  key: ScenarioKey,
  a: ScenarioAssumptions,
  baseRevenue: number | null,
  ownership: number,
  invested: number,
  fromYear: number,
): ScenarioResult {
  const years = Math.max(0, a.exitYear - fromYear);
  const futureRevenue = isNum(baseRevenue)
    ? baseRevenue * Math.pow(1 + a.revenueGrowth, years)
    : null;
  const futureEbitda = isNum(futureRevenue) ? futureRevenue * a.ebitdaMargin : null;
  const companyValue =
    a.exitBasis === "EBITDA"
      ? isNum(futureEbitda)
        ? Math.max(0, futureEbitda * a.exitMultiple)
        : null
      : isNum(futureRevenue)
        ? Math.max(0, futureRevenue * a.exitMultiple)
        : null;
  const ownershipAtExit = ownership * (1 - a.dilution);
  const valueOfPosition = isNum(companyValue) ? companyValue * ownershipAtExit : null;
  const profit = isNum(valueOfPosition) ? valueOfPosition - invested : null;
  return {
    key,
    years,
    futureRevenue,
    futureEbitda,
    companyValue,
    ownershipAtExit,
    valueOfPosition,
    profit,
    moic: isNum(valueOfPosition) ? moic(invested, valueOfPosition) : null,
    irr: isNum(valueOfPosition) ? simpleIrr(invested, valueOfPosition, years) : null,
  };
}

export interface ScenarioTriple {
  downside: ScenarioResult;
  base: ScenarioResult;
  upside: ScenarioResult;
}

export function projectAll(
  scenarios: ScenarioSet,
  baseRevenue: number | null,
  ownership: number,
  invested: number,
  fromYear: number,
): ScenarioTriple {
  return {
    downside: projectScenario("downside", scenarios.downside, baseRevenue, ownership, invested, fromYear),
    base: projectScenario("base", scenarios.base, baseRevenue, ownership, invested, fromYear),
    upside: projectScenario("upside", scenarios.upside, baseRevenue, ownership, invested, fromYear),
  };
}

/** Ownership implied by putting `amount` into a company at `valuation` (pre-money). */
export function impliedOwnership(amount: number, preMoneyValuation: number): number {
  if (amount <= 0 || preMoneyValuation <= 0) return 0;
  return amount / (preMoneyValuation + amount);
}
