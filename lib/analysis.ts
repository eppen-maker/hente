import {
  deriveYears,
  isNum,
  latestYear,
  summariseHistory,
  valuationMetrics,
} from "./finance";
import { compact, nok, pct, signedPct } from "./format";
import { buildPosition } from "./portfolio";
import type { Company, Investment } from "./types";

/**
 * Analysis engine.
 *
 * Everything below is generated from data that is actually in the system.
 * A statement is either
 *   FACT           – restates a reported figure or a deterministic calculation
 *   INTERPRETATION – a reading of those figures, clearly labelled as such
 *   ASSUMPTION     – one of our own inputs
 * and no number is produced that cannot be traced back to stored data.
 * Where data is missing the engine says so instead of filling the gap.
 */

export type StatementKind = "FACT" | "INTERPRETATION" | "ASSUMPTION" | "GAP";

export interface Statement {
  kind: StatementKind;
  text: string;
}

export interface AnalysisSection {
  id: string;
  title: string;
  statements: Statement[];
}

const fact = (text: string): Statement => ({ kind: "FACT", text });
const interp = (text: string): Statement => ({ kind: "INTERPRETATION", text });
const assume = (text: string): Statement => ({ kind: "ASSUMPTION", text });
const gap = (text: string): Statement => ({ kind: "GAP", text });

const pp = (a: number | null, b: number | null): string | null =>
  isNum(a) && isNum(b) ? `${((b - a) * 100).toFixed(1)} percentage points` : null;

export function analyseCompany(company: Company, investments: Investment[] = []): AnalysisSection[] {
  const years = deriveYears(company.financials);
  const h = summariseHistory(company.financials);
  const last = years[years.length - 1] ?? null;
  const prev = years.length > 1 ? years[years.length - 2] : null;
  const v = valuationMetrics(company);
  const position = buildPosition(company, investments);
  const q = company.qualitative;
  const sections: AnalysisSection[] = [];

  /* COMPANY SUMMARY ------------------------------------------------- */
  const summary: Statement[] = [];
  summary.push(
    fact(
      `${company.name} is ${company.listing === "LISTED" ? "a listed" : "an unlisted"} ${company.sector.toLowerCase()} company in ${company.industry.toLowerCase()}, based in ${company.location}${company.foundedYear ? `, founded in ${company.foundedYear}` : ""}.`,
    ),
  );
  if (last && isNum(last.revenue)) {
    summary.push(
      fact(
        `Reported ${last.period} revenue was ${nok(last.revenue)}${isNum(last.ebitda) ? ` with EBITDA of ${nok(last.ebitda)}` : ""}${isNum(last.employees) ? ` and ${last.employees} employees` : ""}. Source: ${last.source}.`,
      ),
    );
  } else {
    summary.push(gap("No reported financial year is registered for this company."));
  }
  if (isNum(h.revenueCagr) && h.years > 0) {
    summary.push(
      fact(
        `Revenue has moved from ${nok(h.revenueFirst)} in ${h.firstYear} to ${nok(h.revenueLast)} in ${h.lastYear}, which corresponds to approximately ${pct(h.revenueCagr, 0)} CAGR over ${h.years} years.`,
      ),
    );
  }
  if (position.invested > 0) {
    summary.push(
      fact(
        `We have invested ${nok(position.invested)} across ${position.investments.length} transaction${position.investments.length === 1 ? "" : "s"} for ${pct(position.ownership, 2)} of the equity, held ${position.structures.includes("VEHICLE") ? "through Hente Invest AS" : "directly by the investors"}.`,
      ),
    );
  } else {
    summary.push(fact(`We hold no position. Current status: ${company.status.replace("_", " ").toLowerCase()}.`));
  }
  sections.push({ id: "summary", title: "Company summary", statements: summary });

  /* BUSINESS MODEL -------------------------------------------------- */
  sections.push({
    id: "business-model",
    title: "Business model",
    statements: [
      q.businessModel ? fact(q.businessModel) : gap("Business model has not been registered."),
      q.customers ? fact(`Customers: ${q.customers}`) : gap("Customer base has not been registered."),
      last && isNum(last.revenuePerEmployee)
        ? fact(`Revenue per employee in ${last.period} was ${nok(last.revenuePerEmployee)}.`)
        : gap("Revenue per employee cannot be calculated – employee count or revenue is unavailable."),
    ],
  });

  /* FINANCIAL DEVELOPMENT ------------------------------------------- */
  const fin: Statement[] = [];
  if (years.length >= 2) {
    fin.push(
      fact(
        `${years.length} reported years are registered (${h.firstYear}–${h.lastYear}), sourced from ${Array.from(new Set(years.map((y) => y.source))).join("; ")}.`,
      ),
    );
    if (last && prev) {
      if (isNum(last.revenueGrowth)) {
        fin.push(fact(`Revenue changed ${signedPct(last.revenueGrowth)} from ${prev.period} to ${last.period}.`));
      }
      if (isNum(last.ebitda) && isNum(prev.ebitda)) {
        fin.push(fact(`EBITDA moved from ${nok(prev.ebitda)} to ${nok(last.ebitda)}.`));
      }
    }
    if (isNum(h.ebitdaCagr)) fin.push(fact(`EBITDA CAGR over the period is ${pct(h.ebitdaCagr, 0)}.`));
    const growthSeries = years.map((y) => y.revenueGrowth).filter(isNum);
    if (growthSeries.length >= 3) {
      const recent = growthSeries.slice(-2);
      const earlier = growthSeries.slice(0, -2);
      const avgEarlier = earlier.reduce((s, x) => s + x, 0) / Math.max(1, earlier.length);
      const avgRecent = recent.reduce((s, x) => s + x, 0) / recent.length;
      if (avgRecent > avgEarlier + 0.03) {
        interpPush(fin, `Revenue growth in the last two years (${pct(avgRecent, 0)} average) is above the earlier years (${pct(avgEarlier, 0)} average), so growth appears to be accelerating.`);
      } else if (avgRecent < avgEarlier - 0.03) {
        interpPush(fin, `Revenue growth in the last two years (${pct(avgRecent, 0)} average) is below the earlier years (${pct(avgEarlier, 0)} average), so growth appears to be slowing.`);
      } else {
        interpPush(fin, `Revenue growth has been broadly stable across the period, averaging ${pct(avgRecent, 0)} most recently.`);
      }
    }
  } else {
    fin.push(gap("Fewer than two reported years are registered, so no development can be calculated."));
  }
  sections.push({ id: "financial-development", title: "Financial development", statements: fin });

  /* GROWTH ANALYSIS -------------------------------------------------- */
  const gr: Statement[] = [];
  if (isNum(h.revenueCagr)) gr.push(fact(`Revenue CAGR ${h.firstYear}–${h.lastYear}: ${pct(h.revenueCagr, 1)}.`));
  if (isNum(h.employeeCagr)) gr.push(fact(`Headcount CAGR over the same period: ${pct(h.employeeCagr, 1)}.`));
  if (isNum(h.revenuePerEmployeeFirst) && isNum(h.revenuePerEmployeeLast)) {
    gr.push(
      fact(
        `Revenue per employee moved from ${nok(h.revenuePerEmployeeFirst)} to ${nok(h.revenuePerEmployeeLast)}.`,
      ),
    );
    if (h.revenuePerEmployeeLast > h.revenuePerEmployeeFirst * 1.1) {
      interpPush(gr, "Revenue is growing faster than headcount, which is consistent with operating leverage rather than pure headcount-driven growth.");
    } else if (h.revenuePerEmployeeLast < h.revenuePerEmployeeFirst * 0.9) {
      interpPush(gr, "Headcount is growing faster than revenue, which usually means investment ahead of revenue or falling productivity. Worth understanding which.");
    }
  }
  if (q.growthDrivers.length) gr.push(fact(`Registered growth drivers: ${q.growthDrivers.join("; ")}.`));
  if (!gr.length) gr.push(gap("No growth data registered."));
  sections.push({ id: "growth", title: "Growth analysis", statements: gr });

  /* PROFITABILITY ---------------------------------------------------- */
  const pr: Statement[] = [];
  if (last && isNum(last.ebitdaMargin)) {
    pr.push(fact(`EBITDA margin in ${last.period} was ${pct(last.ebitdaMargin)}.`));
    const delta = pp(h.marginFirst, h.marginLast);
    if (delta && isNum(h.marginFirst) && isNum(h.marginLast)) {
      pr.push(fact(`EBITDA margin moved from ${pct(h.marginFirst)} in ${h.firstYear} to ${pct(h.marginLast)} in ${h.lastYear}, a change of ${delta}.`));
      if (h.marginLast > h.marginFirst + 0.02) {
        interpPush(pr, "Margins have expanded while revenue has grown, which points to scale benefits or a mix shift towards higher-margin revenue.");
      } else if (h.marginLast < h.marginFirst - 0.02) {
        interpPush(pr, "Margins have contracted over the period. Whether this is price, cost or mix is not visible in the registered data.");
      }
    }
  } else {
    pr.push(gap("EBITDA margin cannot be calculated for the most recent year."));
  }
  if (last && isNum(last.netIncome)) {
    pr.push(fact(`Net income in ${last.period} was ${nok(last.netIncome)}${isNum(last.netMargin) ? ` (${pct(last.netMargin)} net margin)` : ""}.`));
    if (last.netIncome < 0) interpPush(pr, "The company is loss-making at the bottom line, so any valuation rests on future profitability rather than current earnings.");
  }
  if (last && isNum(last.roe)) pr.push(fact(`Return on equity in ${last.period}: ${pct(last.roe)}.`));
  sections.push({ id: "profitability", title: "Profitability", statements: pr });

  /* BALANCE SHEET ---------------------------------------------------- */
  const bs: Statement[] = [];
  if (last) {
    if (isNum(last.equity)) bs.push(fact(`Equity at the end of ${last.period}: ${nok(last.equity)}.`));
    if (isNum(last.totalAssets)) bs.push(fact(`Total assets: ${nok(last.totalAssets)}.`));
    if (isNum(last.equityRatio)) {
      bs.push(fact(`Equity ratio: ${pct(last.equityRatio)}.`));
      if (last.equityRatio < 0.2) interpPush(bs, "The equity ratio is thin, which limits the buffer for a weak year.");
      else if (last.equityRatio > 0.5) interpPush(bs, "The balance sheet is equity-financed to a degree that leaves room for debt capacity if needed.");
    }
  } else bs.push(gap("No balance sheet data registered."));
  sections.push({ id: "balance-sheet", title: "Balance sheet", statements: bs });

  /* CASH & DEBT ------------------------------------------------------ */
  const cd: Statement[] = [];
  if (last) {
    if (isNum(last.cash)) cd.push(fact(`Cash at the end of ${last.period}: ${nok(last.cash)}.`));
    if (isNum(last.debt)) cd.push(fact(`Interest-bearing debt: ${nok(last.debt)}.`));
    if (isNum(last.netDebt)) {
      cd.push(fact(`Net ${last.netDebt >= 0 ? "debt" : "cash"} position: ${nok(Math.abs(last.netDebt))}.`));
      if (isNum(last.ebitda) && last.ebitda > 0) {
        cd.push(fact(`Net debt / EBITDA: ${(last.netDebt / last.ebitda).toFixed(1)}x.`));
      }
    }
    if (isNum(h.debtFirst) && isNum(h.debtLast)) {
      cd.push(fact(`Debt moved from ${nok(h.debtFirst)} in ${h.firstYear} to ${nok(h.debtLast)} in ${h.lastYear}.`));
      if (h.debtLast > h.debtFirst * 1.2 && isNum(h.ebitdaFirst) && isNum(h.ebitdaLast) && h.ebitdaLast < h.ebitdaFirst) {
        interpPush(cd, "Debt has increased while EBITDA has fallen. That combination narrows the room for error and is the first thing to test in diligence.");
      }
    }
    if (isNum(last.ebitda) && last.ebitda < 0 && isNum(last.cash)) {
      const runwayYears = last.cash / Math.abs(last.ebitda);
      interpPush(cd, `At the ${last.period} EBITDA burn rate, the reported cash balance corresponds to roughly ${runwayYears.toFixed(1)} years of runway, before any change in burn or new capital.`);
    }
  } else cd.push(gap("No cash or debt data registered."));
  sections.push({ id: "cash-debt", title: "Cash & debt", statements: cd });

  /* MANAGEMENT ------------------------------------------------------- */
  sections.push({
    id: "management",
    title: "Management",
    statements: company.management.length
      ? company.management.map((m) => fact(`${m.name} — ${m.role}${m.background ? `. ${m.background}` : ""}`))
      : [gap("No management information registered.")],
  });

  /* OWNERSHIP -------------------------------------------------------- */
  const own: Statement[] = [];
  const totalShares = company.capTable.reduce((s, x) => s + x.shares, 0);
  if (totalShares > 0) {
    const top = [...company.capTable].sort((a, b) => b.shares - a.shares)[0];
    own.push(fact(`${company.capTable.length} shareholders registered across ${compact(totalShares)} shares. Largest holder: ${top.name} with ${pct(top.shares / totalShares)}.`));
    const us = company.capTable.find((s) => s.isUs);
    if (us) own.push(fact(`Our registered holding: ${compact(us.shares)} shares, ${pct(us.shares / totalShares, 2)}.`));
  } else own.push(gap("No cap table registered."));
  if (company.fundingRounds.length) {
    const r = company.fundingRounds[company.fundingRounds.length - 1];
    own.push(fact(`Most recent round: ${r.name} (${r.date.slice(0, 7)})${isNum(r.preMoney) ? ` at ${nok(r.preMoney)} pre-money` : ""}${isNum(r.raised) ? `, raising ${nok(r.raised)}` : ""}.`));
  }
  sections.push({ id: "ownership", title: "Ownership", statements: own });

  /* COMPETITIVE ADVANTAGES ------------------------------------------- */
  sections.push({
    id: "moat",
    title: "Competitive advantages",
    statements: q.moat.length ? q.moat.map(fact) : [gap("No competitive advantages registered.")],
  });

  /* GROWTH DRIVERS ---------------------------------------------------- */
  sections.push({
    id: "drivers",
    title: "Growth drivers",
    statements: q.growthDrivers.length ? q.growthDrivers.map(fact) : [gap("No growth drivers registered.")],
  });

  /* KEY RISKS ---------------------------------------------------------- */
  const risks: Statement[] = q.risks.map(fact);
  if (last && isNum(last.equityRatio) && last.equityRatio < 0.25) {
    interpPush(risks, `Equity ratio of ${pct(last.equityRatio)} leaves limited absorption capacity for a weak year.`);
  }
  if (last && isNum(last.netIncome) && last.netIncome < 0 && isNum(last.cash) && isNum(last.ebitda) && last.ebitda < 0) {
    interpPush(risks, "The company is cash-consuming, so further capital is likely required and dilution should be assumed in any scenario.");
  }
  sections.push({ id: "risks", title: "Key risks", statements: risks.length ? risks : [gap("No risks registered.")] });

  /* CATALYSTS ---------------------------------------------------------- */
  sections.push({
    id: "catalysts",
    title: "Potential catalysts",
    statements: q.catalysts.length ? q.catalysts.map(fact) : [gap("No catalysts registered.")],
  });

  /* IMPORTANT QUESTIONS -------------------------------------------------- */
  const questions: Statement[] = [];
  if (isNum(h.revenueCagr) && h.revenueCagr > 0.2)
    questions.push(interp(`What share of the ${pct(h.revenueCagr, 0)} revenue CAGR is volume, price and new customers respectively?`));
  if (last && isNum(last.ebitdaMargin) && isNum(h.marginFirst) && last.ebitdaMargin > h.marginFirst)
    questions.push(interp("Is the margin expansion structural, or does it reflect a favourable project mix in the last year?"));
  if (isNum(v.evEbitda)) questions.push(interp(`The current valuation implies ${v.evEbitda.toFixed(1)}x EV/EBITDA on trailing numbers. What growth does that require to be justified?`));
  if (company.capTable.some((s) => /option pool/i.test(s.name)))
    questions.push(interp("How much of the option pool is granted, and what is the expected dilution at exit?"));
  questions.push(interp("What would need to be true in three years for this to be a poor investment?"));
  sections.push({ id: "questions", title: "Important questions", statements: questions });

  /* MISSING INFORMATION --------------------------------------------------- */
  const missing: Statement[] = q.missingInformation.map(gap);
  const gapsFromData: string[] = [];
  if (!last || !isNum(last.employees)) gapsFromData.push("Employee count for the most recent year");
  if (!last || !isNum(last.debt)) gapsFromData.push("Interest-bearing debt");
  if (!isNum(company.valuation.latestValuation) && !isNum(v.marketCap)) gapsFromData.push("A current valuation reference");
  if (company.financials.length < 5) gapsFromData.push(`Only ${company.financials.length} reported years registered (five is the target)`);
  if (!company.documents.length) gapsFromData.push("No documents uploaded");
  missing.push(...gapsFromData.map(gap));
  sections.push({
    id: "missing",
    title: "Missing information",
    statements: missing.length ? missing : [fact("No known gaps registered.")],
  });

  return sections;
}

function interpPush(arr: Statement[], text: string) {
  arr.push(interp(text));
}

/* ------------------------------------------------------------------ *
 * Investment thesis structuring                                       *
 * ------------------------------------------------------------------ */

const THESIS_BUCKETS: { key: keyof StructuredThesis; label: string; cues: RegExp }[] = [
  { key: "whyNow", label: "Why now", cues: /\b(now|timing|regulat|tailwind|window|currently|this year)\b/i },
  { key: "marketOpportunity", label: "Market opportunity", cues: /\b(market|demand|customers|segment|tam|fleet|industry)\b/i },
  { key: "competitiveAdvantage", label: "Competitive advantage", cues: /\b(moat|advantage|approval|lock-?in|switching|barrier|proprietary|patent)\b/i },
  { key: "growthDrivers", label: "Growth drivers", cues: /\b(growth|grow|expand|scal|revenue|backlog|pipeline)\b/i },
  { key: "scalability", label: "Scalability", cues: /\b(margin|scal|repeatable|operating leverage|per employee|recurring)\b/i },
  { key: "management", label: "Management", cues: /\b(ceo|cfo|founder|management|team|board)\b/i },
  { key: "catalysts", label: "Potential catalysts", cues: /\b(catalyst|contract|approval|round|listing|exit|milestone)\b/i },
  { key: "keyRisks", label: "Key risks", cues: /\b(risk|concentrat|depend|single|watch|churn|cyclical|dilut|debt)\b/i },
];

export interface StructuredThesis {
  whyNow: string;
  marketOpportunity: string;
  competitiveAdvantage: string;
  growthDrivers: string;
  scalability: string;
  management: string;
  catalysts: string;
  keyRisks: string;
  generatedAt: string;
}

/**
 * Structures our own thesis text into the standard sections. It only sorts and
 * supplements our sentences with registered facts – it never rewrites them, and
 * the original text is always kept and displayed next to the structure.
 */
export function structureThesis(company: Company): StructuredThesis {
  const text = company.thesis.ourText ?? "";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = {} as StructuredThesis;
  const q = company.qualitative;
  const h = summariseHistory(company.financials);

  for (const bucket of THESIS_BUCKETS) {
    const hits = sentences.filter((s) => bucket.cues.test(s));
    out[bucket.key] = hits.join(" ");
  }
  // Supplement empty buckets with registered facts, marked as such by the UI.
  if (!out.marketOpportunity && q.customers) out.marketOpportunity = `Registered: ${q.customers}`;
  if (!out.competitiveAdvantage && q.moat.length) out.competitiveAdvantage = `Registered: ${q.moat.join("; ")}.`;
  if (!out.growthDrivers && q.growthDrivers.length) out.growthDrivers = `Registered: ${q.growthDrivers.join("; ")}.`;
  if (!out.keyRisks && q.risks.length) out.keyRisks = `Registered: ${q.risks.join("; ")}.`;
  if (!out.catalysts && q.catalysts.length) out.catalysts = `Registered: ${q.catalysts.join("; ")}.`;
  if (!out.management && company.management.length)
    out.management = `Registered: ${company.management.map((m) => `${m.name} (${m.role})`).join(", ")}.`;
  if (!out.scalability && isNum(h.marginFirst) && isNum(h.marginLast))
    out.scalability = `Calculated: EBITDA margin moved from ${pct(h.marginFirst)} to ${pct(h.marginLast)} between ${h.firstYear} and ${h.lastYear}.`;
  if (!out.whyNow) out.whyNow = "Not stated in our thesis text.";
  out.generatedAt = new Date().toISOString();
  return out;
}

export const THESIS_LABELS = THESIS_BUCKETS.map((b) => ({ key: b.key, label: b.label }));

/* ------------------------------------------------------------------ *
 * Document Q&A (source-referenced, no invention)                       *
 * ------------------------------------------------------------------ */

export interface DocAnswer {
  answer: string;
  citations: { document: string; page: number; text: string }[];
}

/**
 * Answers only from text that has actually been extracted from a document.
 * With no extracted text, it reports that rather than producing an answer.
 */
export function answerFromDocuments(company: Company, question: string): DocAnswer {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9æøå]+/)
    .filter((t) => t.length > 3);
  const hits: DocAnswer["citations"] = [];
  for (const doc of company.documents) {
    for (const ex of doc.extracts) {
      const score = terms.filter((t) => ex.text.toLowerCase().includes(t)).length;
      if (score > 0) hits.push({ document: doc.name, page: ex.page, text: ex.text });
    }
  }
  if (!hits.length) {
    return {
      answer:
        company.documents.length === 0
          ? "DATA UNAVAILABLE — no documents have been uploaded for this company."
          : "DATA UNAVAILABLE — no extracted passage in the uploaded documents matches this question. Documents are registered but their text has not been indexed, so no answer can be given without inventing one.",
      citations: [],
    };
  }
  return {
    answer: `Found ${hits.length} matching passage${hits.length === 1 ? "" : "s"} in the uploaded documents. Each is quoted with its file and page below.`,
    citations: hits.slice(0, 5),
  };
}

/* ------------------------------------------------------------------ *
 * Snapshot comparison: what we expected vs what happened               *
 * ------------------------------------------------------------------ */

export interface SnapshotComparison {
  label: string;
  expected: string;
  actual: string;
  delta: string | null;
}

export function compareSnapshot(company: Company, investment: Investment): SnapshotComparison[] {
  const snap = investment.snapshot;
  if (!snap) return [];
  const last = latestYear(company);
  const rows: SnapshotComparison[] = [];

  const entryYear = new Date(snap.investmentDate).getFullYear();
  const yearsElapsed = Math.max(0, (last?.year ?? entryYear) - entryYear);
  const expectedRevenue =
    isNum(snap.revenueAtEntry) && yearsElapsed > 0
      ? snap.revenueAtEntry * Math.pow(1 + snap.assumptions.base.revenueGrowth, yearsElapsed)
      : snap.revenueAtEntry;

  rows.push({
    label: "Revenue",
    expected: `${nok(expectedRevenue)} (base case, ${pct(snap.assumptions.base.revenueGrowth, 0)} p.a. from ${nok(snap.revenueAtEntry)})`,
    actual: last && isNum(last.revenue) ? `${nok(last.revenue)} (${last.period})` : "DATA UNAVAILABLE",
    delta:
      isNum(expectedRevenue) && last && isNum(last.revenue)
        ? signedPct((last.revenue - expectedRevenue) / expectedRevenue)
        : null,
  });

  const expectedMargin = snap.assumptions.base.ebitdaMargin;
  rows.push({
    label: "EBITDA margin",
    expected: pct(expectedMargin),
    actual: last && isNum(last.ebitdaMargin) ? `${pct(last.ebitdaMargin)} (${last.period})` : "DATA UNAVAILABLE",
    delta: last && isNum(last.ebitdaMargin) ? `${((last.ebitdaMargin - expectedMargin) * 100).toFixed(1)} pp` : null,
  });

  const currentValuation = company.valuation.latestValuation ?? valuationMetrics(company).marketCap;
  rows.push({
    label: "Company valuation",
    expected: `${nok(snap.entryValuation)} at entry`,
    actual: isNum(currentValuation) ? nok(currentValuation) : "DATA UNAVAILABLE",
    delta:
      isNum(currentValuation) && snap.entryValuation > 0
        ? signedPct((currentValuation - snap.entryValuation) / snap.entryValuation)
        : null,
  });

  rows.push({
    label: "Ownership",
    expected: pct(snap.ownershipPct, 2),
    actual: pct(investment.ownershipPct, 2),
    delta: null,
  });

  return rows;
}
