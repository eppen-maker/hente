import {
  deriveYears,
  isNum,
  latestYear,
  projectAll,
  simpleIrr,
  valuationMetrics,
  type ScenarioTriple,
} from "./finance";
import type { Company, Investment, Investor, ScenarioKey, Store } from "./types";

/* ------------------------------------------------------------------ *
 * Positions                                                           *
 * ------------------------------------------------------------------ */

export interface Position {
  company: Company;
  investments: Investment[];
  invested: number;
  ownership: number; // 0–1
  /** Weighted average valuation we entered at. */
  averageEntryValuation: number | null;
  /** Latest known equity value of the whole company (RAW). */
  companyValue: number | null;
  /** Our share of the latest known company value (CALCULATED). */
  currentValue: number | null;
  unrealised: number | null;
  currentMoic: number | null;
  holdingYears: number;
  currentIrr: number | null;
  scenarios: ScenarioTriple;
  structures: ("DIRECT" | "VEHICLE")[];
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export function companyEquityValue(c: Company): number | null {
  const v = valuationMetrics(c);
  if (isNum(v.marketCap)) return v.marketCap;
  return c.valuation.latestValuation;
}

export function buildPosition(company: Company, investments: Investment[], now = new Date()): Position {
  const mine = investments.filter((i) => i.companyId === company.id);
  const invested = mine.reduce((s, i) => s + i.amount, 0);
  const ownership = mine.reduce((s, i) => s + i.ownershipPct, 0);
  const averageEntryValuation = ownership > 0 ? invested / ownership : null;
  const companyValue = companyEquityValue(company);
  const currentValue = isNum(companyValue) && ownership > 0 ? companyValue * ownership : null;
  const unrealised = isNum(currentValue) ? currentValue - invested : null;
  const fy = latestYear(company);
  const first = mine.length ? mine.map((i) => +new Date(i.date)).sort()[0] : null;
  const holdingYears = first ? Math.max(0.01, (+now - first) / YEAR_MS) : 0;
  return {
    company,
    investments: mine,
    invested,
    ownership,
    averageEntryValuation,
    companyValue,
    currentValue,
    unrealised,
    currentMoic: invested > 0 && isNum(currentValue) ? currentValue / invested : null,
    holdingYears,
    currentIrr:
      invested > 0 && isNum(currentValue) && holdingYears > 0.05
        ? simpleIrr(invested, currentValue, holdingYears)
        : null,
    scenarios: projectAll(
      company.scenarios,
      fy?.revenue ?? null,
      ownership,
      invested,
      fy?.year ?? new Date().getFullYear(),
    ),
    structures: Array.from(new Set(mine.map((i) => i.structure))),
  };
}

export function positionsOf(store: Store): Position[] {
  return store.companies
    .map((c) => buildPosition(c, store.investments))
    .filter((p) => p.invested > 0)
    .sort((a, b) => b.invested - a.invested);
}

/** Scenario projection for a hypothetical (not yet made) investment. */
export function hypotheticalPosition(company: Company, amount: number, preMoney: number): ScenarioTriple {
  const fy = latestYear(company);
  const ownership = amount > 0 && preMoney > 0 ? amount / (preMoney + amount) : 0;
  return projectAll(company.scenarios, fy?.revenue ?? null, ownership, amount, fy?.year ?? new Date().getFullYear());
}

/* ------------------------------------------------------------------ *
 * Portfolio aggregates                                                *
 * ------------------------------------------------------------------ */

export interface PortfolioTotals {
  totalCapital: number;
  committedCapital: number;
  invested: number;
  reserved: number;
  available: number;
  currentValue: number;
  unrealised: number;
  downsideValue: number;
  baseValue: number;
  upsideValue: number;
  downsideProfit: number;
  baseProfit: number;
  upsideProfit: number;
  moic: number | null;
  baseMoic: number | null;
  upsideMoic: number | null;
  baseIrr: number | null;
  numberOfInvestments: number;
  numberOfCompanies: number;
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((s, x) => s + (isNum(x) ? x : 0), 0);

export function portfolioTotals(store: Store): PortfolioTotals {
  const positions = positionsOf(store);
  const totalCapital = store.investors.reduce((s, i) => s + i.availableCapital, 0);
  const committedCapital = store.investors.reduce((s, i) => s + i.committedCapital, 0);
  const invested = positions.reduce((s, p) => s + p.invested, 0);
  const reserved = store.reserves.reduce((s, r) => s + r.amount, 0);
  const currentValue = sum(positions.map((p) => p.currentValue ?? p.invested));
  const downsideValue = sum(positions.map((p) => p.scenarios.downside.valueOfPosition));
  const baseValue = sum(positions.map((p) => p.scenarios.base.valueOfPosition));
  const upsideValue = sum(positions.map((p) => p.scenarios.upside.valueOfPosition));
  const weightedYears =
    positions.length > 0
      ? positions.reduce((s, p) => s + p.scenarios.base.years * p.invested, 0) / Math.max(1, invested)
      : 0;
  return {
    totalCapital,
    committedCapital,
    invested,
    reserved,
    available: totalCapital - invested - reserved,
    currentValue,
    unrealised: currentValue - invested,
    downsideValue,
    baseValue,
    upsideValue,
    downsideProfit: downsideValue - invested,
    baseProfit: baseValue - invested,
    upsideProfit: upsideValue - invested,
    moic: invested > 0 ? currentValue / invested : null,
    baseMoic: invested > 0 ? baseValue / invested : null,
    upsideMoic: invested > 0 ? upsideValue / invested : null,
    baseIrr: invested > 0 && weightedYears > 0 ? simpleIrr(invested, baseValue, weightedYears) : null,
    numberOfInvestments: store.investments.length,
    numberOfCompanies: positions.length,
  };
}

/* ------------------------------------------------------------------ *
 * Investor attribution                                                *
 * ------------------------------------------------------------------ */

/**
 * An investor's share of a single investment.
 *
 * DIRECT  – the investor holds the shares; share = their allocation / total.
 * VEHICLE – Investment AS holds the shares; the investor's attributable share
 *           equals their ownership of Investment AS. The two structures are
 *           computed separately and never mixed into one ownership number.
 */
export function investorShareOf(inv: Investment, investor: Investor): number {
  if (inv.structure === "DIRECT") {
    const total = inv.allocations.reduce((s, a) => s + a.amount, 0);
    if (total <= 0) return 0;
    const line = inv.allocations.find((a) => a.investorId === investor.id);
    return line ? line.amount / total : 0;
  }
  return investor.vehicleOwnership;
}

export interface InvestorHolding {
  company: Company;
  structure: "DIRECT" | "VEHICLE";
  invested: number;
  ownership: number; // attributable ownership of the underlying company
  currentValue: number | null;
  downsideValue: number | null;
  baseValue: number | null;
  upsideValue: number | null;
  baseProfit: number | null;
  moic: number | null;
  baseMoic: number | null;
  baseIrr: number | null;
  years: number;
}

export interface InvestorSummary {
  investor: Investor;
  holdings: InvestorHolding[];
  invested: number;
  remaining: number;
  currentValue: number;
  downsideValue: number;
  baseValue: number;
  upsideValue: number;
  baseProfit: number;
  upsideProfit: number;
  downsideProfit: number;
  moic: number | null;
  baseMoic: number | null;
  baseIrr: number | null;
  directInvested: number;
  vehicleInvested: number;
}

export function investorSummary(store: Store, investor: Investor): InvestorSummary {
  const positions = positionsOf(store);
  const holdings: InvestorHolding[] = [];

  for (const p of positions) {
    for (const structure of ["DIRECT", "VEHICLE"] as const) {
      const invs = p.investments.filter((i) => i.structure === structure);
      if (!invs.length) continue;
      const invested = invs.reduce((s, i) => s + i.amount * investorShareOf(i, investor), 0);
      if (invested <= 0) continue;
      const ownership = invs.reduce((s, i) => s + i.ownershipPct * investorShareOf(i, investor), 0);
      const shareOfPosition = p.invested > 0 ? invested / p.invested : 0;
      const scale = (v: number | null) => (isNum(v) ? v * shareOfPosition : null);
      const currentValue = scale(p.currentValue);
      const baseValue = scale(p.scenarios.base.valueOfPosition);
      const years = p.scenarios.base.years;
      holdings.push({
        company: p.company,
        structure,
        invested,
        ownership,
        currentValue,
        downsideValue: scale(p.scenarios.downside.valueOfPosition),
        baseValue,
        upsideValue: scale(p.scenarios.upside.valueOfPosition),
        baseProfit: isNum(baseValue) ? baseValue - invested : null,
        moic: isNum(currentValue) && invested > 0 ? currentValue / invested : null,
        baseMoic: isNum(baseValue) && invested > 0 ? baseValue / invested : null,
        baseIrr: isNum(baseValue) && invested > 0 && years > 0 ? simpleIrr(invested, baseValue, years) : null,
        years,
      });
    }
  }

  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const currentValue = sum(holdings.map((h) => h.currentValue ?? h.invested));
  const downsideValue = sum(holdings.map((h) => h.downsideValue));
  const baseValue = sum(holdings.map((h) => h.baseValue));
  const upsideValue = sum(holdings.map((h) => h.upsideValue));
  const weightedYears =
    invested > 0 ? holdings.reduce((s, h) => s + h.years * h.invested, 0) / invested : 0;

  return {
    investor,
    holdings: holdings.sort((a, b) => b.invested - a.invested),
    invested,
    remaining: investor.availableCapital - invested,
    currentValue,
    downsideValue,
    baseValue,
    upsideValue,
    baseProfit: baseValue - invested,
    upsideProfit: upsideValue - invested,
    downsideProfit: downsideValue - invested,
    moic: invested > 0 ? currentValue / invested : null,
    baseMoic: invested > 0 ? baseValue / invested : null,
    baseIrr: invested > 0 && weightedYears > 0 ? simpleIrr(invested, baseValue, weightedYears) : null,
    directInvested: holdings.filter((h) => h.structure === "DIRECT").reduce((s, h) => s + h.invested, 0),
    vehicleInvested: holdings.filter((h) => h.structure === "VEHICLE").reduce((s, h) => s + h.invested, 0),
  };
}

export const allInvestorSummaries = (store: Store): InvestorSummary[] =>
  store.investors.map((i) => investorSummary(store, i)).sort((a, b) => b.invested - a.invested);

/* ------------------------------------------------------------------ *
 * Allocation / concentration views                                    *
 * ------------------------------------------------------------------ */

export interface Slice {
  key: string;
  value: number;
  share: number;
}

function toSlices(map: Map<string, number>): Slice[] {
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export function allocationBy(
  store: Store,
  dimension: "company" | "sector" | "industry" | "listing" | "stage" | "investor",
  basis: "invested" | "currentValue" = "invested",
): Slice[] {
  const positions = positionsOf(store);
  const map = new Map<string, number>();
  if (dimension === "investor") {
    for (const s of allInvestorSummaries(store)) {
      if (s.invested > 0) map.set(s.investor.name, (map.get(s.investor.name) ?? 0) + s.invested);
    }
    return toSlices(map);
  }
  for (const p of positions) {
    const amount = basis === "invested" ? p.invested : (p.currentValue ?? p.invested);
    const key =
      dimension === "company"
        ? p.company.name
        : dimension === "sector"
          ? p.company.sector
          : dimension === "industry"
            ? p.company.industry
            : dimension === "stage"
              ? p.company.stage
              : p.company.listing === "LISTED"
                ? "Listed"
                : "Unlisted";
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return toSlices(map);
}

/* ------------------------------------------------------------------ *
 * Portfolio value over time (from reported data + investment dates)   *
 * ------------------------------------------------------------------ */

export interface ValuePoint {
  year: number;
  deployed: number;
  estimatedValue: number;
}

/**
 * Deployed capital is exact (investment dates). Estimated value uses the
 * company valuation known at that time where we have one, otherwise it holds
 * the deployed amount at cost – it never extrapolates a valuation.
 */
export function portfolioValueOverTime(store: Store): ValuePoint[] {
  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  const firstYear = store.investments.length
    ? Math.min(...store.investments.map((i) => new Date(i.date).getFullYear()))
    : currentYear;
  for (let y = firstYear; y <= currentYear; y++) years.push(y);

  return years.map((year) => {
    let deployed = 0;
    let value = 0;
    for (const c of store.companies) {
      const invs = store.investments.filter(
        (i) => i.companyId === c.id && new Date(i.date).getFullYear() <= year,
      );
      if (!invs.length) continue;
      const amount = invs.reduce((s, i) => s + i.amount, 0);
      const ownership = invs.reduce((s, i) => s + i.ownershipPct, 0);
      deployed += amount;
      if (year === currentYear) {
        const cv = companyEquityValue(c);
        value += isNum(cv) ? cv * ownership : amount;
      } else {
        // Mark at the round valuation in force that year, else at cost.
        const round = [...c.fundingRounds]
          .filter((r) => new Date(r.date).getFullYear() <= year && isNum(r.preMoney))
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
        const mark = round && isNum(round.preMoney) ? round.preMoney + (round.raised ?? 0) : null;
        value += isNum(mark) ? Math.max(amount, mark * ownership) : amount;
      }
    }
    return { year, deployed, estimatedValue: value };
  });
}

/* ------------------------------------------------------------------ *
 * Recent developments                                                 *
 * ------------------------------------------------------------------ */

export interface Development {
  companyId: string;
  companyName: string;
  date: string;
  kind: string;
  title: string;
  detail?: string;
  source: string;
}

export function recentDevelopments(store: Store, limit = 8): Development[] {
  return store.companies
    .flatMap((c) =>
      c.updates.map((u) => ({
        companyId: c.id,
        companyName: c.name,
        date: u.date,
        kind: u.kind,
        title: u.title,
        detail: u.detail,
        source: u.source,
      })),
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Scenario lab                                                        *
 * ------------------------------------------------------------------ */

export interface LabLine {
  companyId: string;
  companyName: string;
  amount: number;
  ownership: number;
  downside: number | null;
  base: number | null;
  upside: number | null;
}

export interface LabResult {
  lines: LabLine[];
  totalInvested: number;
  remaining: number;
  downsideValue: number;
  baseValue: number;
  upsideValue: number;
  downsideProfit: number;
  baseProfit: number;
  upsideProfit: number;
  moicBase: number | null;
  moicDownside: number | null;
  moicUpside: number | null;
  irrBase: number | null;
  years: number;
}

export function runLab(
  store: Store,
  totalCapital: number,
  positions: { companyId: string; amount: number }[],
): LabResult {
  const lines: LabLine[] = [];
  for (const pos of positions) {
    const c = store.companies.find((x) => x.id === pos.companyId);
    if (!c || pos.amount <= 0) continue;
    const preMoney = companyEquityValue(c);
    const ownership = isNum(preMoney) && preMoney > 0 ? pos.amount / (preMoney + pos.amount) : 0;
    const fy = latestYear(c);
    const tri = projectAll(c.scenarios, fy?.revenue ?? null, ownership, pos.amount, fy?.year ?? new Date().getFullYear());
    lines.push({
      companyId: c.id,
      companyName: c.name,
      amount: pos.amount,
      ownership,
      downside: tri.downside.valueOfPosition,
      base: tri.base.valueOfPosition,
      upside: tri.upside.valueOfPosition,
    });
  }
  const totalInvested = lines.reduce((s, l) => s + l.amount, 0);
  const downsideValue = sum(lines.map((l) => l.downside));
  const baseValue = sum(lines.map((l) => l.base));
  const upsideValue = sum(lines.map((l) => l.upside));
  const years =
    lines.length && totalInvested > 0
      ? lines.reduce((s, l) => {
          const c = store.companies.find((x) => x.id === l.companyId)!;
          const fy = latestYear(c);
          return s + (c.scenarios.base.exitYear - (fy?.year ?? new Date().getFullYear())) * l.amount;
        }, 0) / totalInvested
      : 0;
  return {
    lines,
    totalInvested,
    remaining: totalCapital - totalInvested,
    downsideValue,
    baseValue,
    upsideValue,
    downsideProfit: downsideValue - totalInvested,
    baseProfit: baseValue - totalInvested,
    upsideProfit: upsideValue - totalInvested,
    moicBase: totalInvested > 0 ? baseValue / totalInvested : null,
    moicDownside: totalInvested > 0 ? downsideValue / totalInvested : null,
    moicUpside: totalInvested > 0 ? upsideValue / totalInvested : null,
    irrBase: totalInvested > 0 && years > 0 ? simpleIrr(totalInvested, baseValue, years) : null,
    years,
  };
}

export const scenarioLabel: Record<ScenarioKey, string> = {
  downside: "Downside",
  base: "Base",
  upside: "Upside",
};

export const historyTable = (c: Company) => deriveYears(c.financials);
