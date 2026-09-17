import { analyseCompany, structureThesis } from "./analysis";
import { latestYear, summariseHistory, valuationMetrics, deriveYears } from "./finance";
import { multiple, nok, pct, signedNok } from "./format";
import { buildPosition } from "./portfolio";
import type { Company, ScenarioKey, Store } from "./types";

const SCEN: ScenarioKey[] = ["downside", "base", "upside"];

/** Generates the memo body as markdown. Frozen as a snapshot when saved. */
export function generateMemo(store: Store, company: Company): string {
  const position = buildPosition(company, store.investments);
  const years = deriveYears(company.financials);
  const h = summariseHistory(company.financials);
  const v = valuationMetrics(company);
  const last = latestYear(company);
  const sections = analyseCompany(company, store.investments);
  const thesis = structureThesis(company);
  const find = (id: string) => sections.find((s) => s.id === id);
  const lines: string[] = [];
  const now = new Date();

  const bullets = (id: string, kinds: string[] = ["FACT", "INTERPRETATION", "GAP", "ASSUMPTION"]) =>
    (find(id)?.statements ?? [])
      .filter((s) => kinds.includes(s.kind))
      .map((s) => `- ${s.kind === "INTERPRETATION" ? "*(interpretation)* " : s.kind === "GAP" ? "*(gap)* " : ""}${s.text}`)
      .join("\n") || "- DATA UNAVAILABLE";

  lines.push(`# Investment memo — ${company.name}`);
  lines.push("");
  lines.push(
    `**Generated** ${now.toISOString().slice(0, 10)} · **Status** ${company.status.replace("_", " ")} · **${company.listing === "LISTED" ? "Listed" : "Unlisted"}** · ${company.sector} / ${company.industry}`,
  );
  lines.push("");
  lines.push(
    "> This memo is generated from data registered in the system. Reported figures are marked as facts, our own inputs as assumptions, and readings of the data as interpretation. Scenario values are sensitivity analysis, not forecasts.",
  );

  lines.push("\n## 1. Executive summary\n");
  lines.push(bullets("summary"));

  lines.push("\n## 2. Company\n");
  lines.push(`- ${company.description}`);
  lines.push(`- Location: ${company.location}${company.orgNr ? ` · Org.nr ${company.orgNr}` : ""}${company.ticker ? ` · ${company.ticker}` : ""}`);
  lines.push(`- Founded: ${company.foundedYear ?? "DATA UNAVAILABLE"} · Employees: ${company.employeesLatest ?? "DATA UNAVAILABLE"}`);

  lines.push("\n## 3. Business model\n");
  lines.push(bullets("business-model"));

  lines.push("\n## 4. Market\n");
  lines.push(bullets("drivers"));

  lines.push("\n## 5. Historical financials\n");
  if (years.length) {
    lines.push("| Year | Revenue | Growth | EBITDA | Margin | Net income | Equity | Net debt | Employees |");
    lines.push("|---|---|---|---|---|---|---|---|---|");
    for (const y of years) {
      lines.push(
        `| ${y.year} | ${nok(y.revenue)} | ${pct(y.revenueGrowth)} | ${nok(y.ebitda)} | ${pct(y.ebitdaMargin)} | ${nok(y.netIncome)} | ${nok(y.equity)} | ${nok(y.netDebt)} | ${y.employees ?? "n/a"} |`,
      );
    }
    lines.push("");
    lines.push(`- Revenue CAGR ${h.firstYear}–${h.lastYear}: **${pct(h.revenueCagr)}** (calculated)`);
    lines.push(`- EBITDA CAGR: **${pct(h.ebitdaCagr)}** (calculated)`);
    lines.push(`- Sources: ${Array.from(new Set(years.map((y) => y.source))).join("; ")}`);
  } else {
    lines.push("DATA UNAVAILABLE — no reported years registered.");
  }

  lines.push("\n## 6. Investment thesis (our own words)\n");
  lines.push(company.thesis.ourText || "Not written yet.");
  lines.push("\n**Structured**\n");
  lines.push(`- Why now: ${thesis.whyNow}`);
  lines.push(`- Market opportunity: ${thesis.marketOpportunity || "Not stated."}`);
  lines.push(`- Competitive advantage: ${thesis.competitiveAdvantage || "Not stated."}`);
  lines.push(`- Growth drivers: ${thesis.growthDrivers || "Not stated."}`);
  lines.push(`- Scalability: ${thesis.scalability || "Not stated."}`);
  lines.push(`- Management: ${thesis.management || "Not stated."}`);
  lines.push(`- Catalysts: ${thesis.catalysts || "Not stated."}`);
  lines.push(`- Key risks: ${thesis.keyRisks || "Not stated."}`);

  lines.push("\n## 7. Valuation\n");
  lines.push(`- Latest reference: ${nok(company.valuation.latestValuation ?? v.marketCap)} (${company.valuation.source})`);
  lines.push(`- Enterprise value: ${nok(v.enterpriseValue)}`);
  lines.push(`- EV/EBITDA: ${multiple(v.evEbitda)} · EV/Revenue: ${multiple(v.evRevenue)} · P/E: ${multiple(v.pe)} · P/B: ${multiple(v.priceBook)}`);
  if (company.valuation.comparableEvEbitda) lines.push(`- Comparable set (our assumption): ${multiple(company.valuation.comparableEvEbitda)} EV/EBITDA`);

  lines.push("\n## 8. Ownership\n");
  lines.push(bullets("ownership"));
  if (position.invested > 0) {
    lines.push(`- Our investment: ${nok(position.invested)} for ${pct(position.ownership, 2)}`);
    lines.push(`- Average entry valuation: ${nok(position.averageEntryValuation)}`);
    lines.push(`- Current estimated value: ${nok(position.currentValue)} (${signedNok(position.unrealised)} unrealised)`);
    lines.push(`- Structure: ${position.structures.join(" + ")}`);
  }

  lines.push("\n## 9. Management\n");
  lines.push(bullets("management"));

  lines.push("\n## 10. Growth drivers\n");
  lines.push(bullets("growth"));

  lines.push("\n## 11. Risks\n");
  lines.push(bullets("risks"));

  lines.push("\n## 12. Scenarios (sensitivity analysis — not forecasts)\n");
  const invested = position.invested > 0 ? position.invested : 1_000_000;
  lines.push(
    position.invested > 0
      ? `Based on our invested ${nok(position.invested)} and ${pct(position.ownership, 2)} ownership.`
      : `Illustrative, based on a hypothetical ${nok(invested)} investment at the latest known valuation.`,
  );
  lines.push("");
  lines.push("| Scenario | Growth p.a. | Margin | Exit | Multiple | Company value | Our value | Profit | MOIC | IRR |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const key of SCEN) {
    const a = company.scenarios[key];
    const r = position.scenarios[key];
    lines.push(
      `| ${key[0].toUpperCase()}${key.slice(1)} | ${pct(a.revenueGrowth, 0)} | ${pct(a.ebitdaMargin, 0)} | ${a.exitYear} | ${multiple(a.exitMultiple)} ${a.exitBasis === "EBITDA" ? "EV/EBITDA" : "EV/Revenue"} | ${nok(r.companyValue)} | ${nok(r.valueOfPosition)} | ${signedNok(r.profit)} | ${multiple(r.moic)} | ${pct(r.irr)} |`,
    );
  }

  lines.push("\n## 13. Expected returns\n");
  lines.push(`- Base case MOIC ${multiple(position.scenarios.base.moic)} over ${position.scenarios.base.years} years, IRR ${pct(position.scenarios.base.irr)} (assumption-driven).`);
  lines.push(`- Downside ${multiple(position.scenarios.downside.moic)} · Upside ${multiple(position.scenarios.upside.moic)}.`);
  lines.push(`- Current mark: ${multiple(position.currentMoic)} MOIC on reported valuation data.`);

  lines.push("\n## 14. Due diligence questions\n");
  lines.push(bullets("questions"));

  lines.push("\n## 15. Missing information\n");
  lines.push(bullets("missing"));

  lines.push("\n---\n");
  lines.push(
    `Data classes used in this memo: RAW (reported accounts, market data), CALCULATED (CAGR, margins, multiples), ASSUMPTION (scenario inputs), INTERPRETATION (readings of the data). Last financial year registered: ${last ? last.period : "none"}.`,
  );

  return lines.join("\n");
}
