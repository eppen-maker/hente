import { notFound } from "next/navigation";
import { ColumnChart, RatioChart } from "@/components/charts";
import { Card, DataTag, Kpi, SectionTitle } from "@/components/ui";
import { analyseCompany } from "@/lib/analysis";
import { readStore } from "@/lib/db";
import { deriveYears, summariseHistory } from "@/lib/finance";
import { compact, date, nok, num, pct } from "@/lib/format";
import { AddYear } from "./AddYear";

const ROWS: { key: string; label: string; format: (v: unknown) => string; tag: "RAW" | "CALCULATED" }[] = [
  { key: "revenue", label: "Revenue", format: (v) => nok(v as number), tag: "RAW" },
  { key: "revenueGrowth", label: "Revenue growth", format: (v) => pct(v as number), tag: "CALCULATED" },
  { key: "ebitda", label: "EBITDA", format: (v) => nok(v as number), tag: "RAW" },
  { key: "ebitdaMargin", label: "EBITDA margin", format: (v) => pct(v as number), tag: "CALCULATED" },
  { key: "operatingProfit", label: "Operating profit", format: (v) => nok(v as number), tag: "RAW" },
  { key: "netIncome", label: "Net income", format: (v) => nok(v as number), tag: "RAW" },
  { key: "equity", label: "Equity", format: (v) => nok(v as number), tag: "RAW" },
  { key: "totalAssets", label: "Total assets", format: (v) => nok(v as number), tag: "RAW" },
  { key: "debt", label: "Debt", format: (v) => nok(v as number), tag: "RAW" },
  { key: "cash", label: "Cash", format: (v) => nok(v as number), tag: "RAW" },
  { key: "netDebt", label: "Net debt", format: (v) => nok(v as number), tag: "CALCULATED" },
  { key: "employees", label: "Employees", format: (v) => num(v as number), tag: "RAW" },
  { key: "revenuePerEmployee", label: "Revenue per employee", format: (v) => nok(v as number), tag: "CALCULATED" },
  { key: "equityRatio", label: "Equity ratio", format: (v) => pct(v as number), tag: "CALCULATED" },
  { key: "roe", label: "Return on equity", format: (v) => pct(v as number), tag: "CALCULATED" },
];

export default async function FinancialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const years = deriveYears(company.financials) as unknown as Record<string, unknown>[];
  const h = summariseHistory(company.financials);
  const sections = analyseCompany(company, store.investments);
  const observations = [
    ...(sections.find((s) => s.id === "financial-development")?.statements ?? []),
    ...(sections.find((s) => s.id === "growth")?.statements ?? []),
  ];

  return (
    <>
      <div className="grid grid-cols-6 gap-3 mb-7">
        <Kpi label="Revenue CAGR" value={pct(h.revenueCagr)} sub={`${h.firstYear}–${h.lastYear}`} tag="CALCULATED" />
        <Kpi label="EBITDA CAGR" value={pct(h.ebitdaCagr)} sub={`${nok(h.ebitdaFirst)} → ${nok(h.ebitdaLast)}`} tag="CALCULATED" />
        <Kpi
          label="Margin development"
          value={h.marginFirst !== null && h.marginLast !== null ? `${((h.marginLast - h.marginFirst) * 100).toFixed(1)} pp` : "DATA UNAVAILABLE"}
          sub={`${pct(h.marginFirst)} → ${pct(h.marginLast)}`}
          tag="CALCULATED"
        />
        <Kpi
          label="Debt development"
          value={h.debtFirst !== null && h.debtLast !== null && h.debtFirst !== 0 ? pct((h.debtLast - h.debtFirst) / h.debtFirst) : "DATA UNAVAILABLE"}
          sub={`${compact(h.debtFirst)} → ${compact(h.debtLast)}`}
          tag="CALCULATED"
        />
        <Kpi label="Employee growth" value={pct(h.employeeCagr)} sub="CAGR over the period" tag="CALCULATED" />
        <Kpi
          label="Revenue per employee"
          value={compact(h.revenuePerEmployeeLast)}
          sub={`from ${compact(h.revenuePerEmployeeFirst)}`}
          tag="CALCULATED"
        />
      </div>

      <Card className="mb-4" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle
            title="Reported financial history"
            hint={`${company.financials.length} reported years registered. Blank cells mean the figure has not been registered — nothing is estimated.`}
            right={<div className="flex gap-1.5"><DataTag kind="RAW" /><DataTag kind="CALCULATED" /></div>}
          />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {years.map((y) => (
                  <th key={String(y.year)} className="text-right">
                    {String(y.year)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="text-[12px]">
                    <span className="flex items-center gap-2">
                      {row.label}
                      <span className="opacity-60">
                        <DataTag kind={row.tag} />
                      </span>
                    </span>
                  </td>
                  {years.map((y) => {
                    const v = y[row.key];
                    const s = v === null || v === undefined ? "—" : row.format(v);
                    const neg = typeof v === "number" && v < 0;
                    return (
                      <td key={String(y.year)} className={`text-right num ${neg ? "text-[color:var(--neg)]" : ""} ${s === "—" ? "text-ink-3" : ""}`}>
                        {s}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="text-[11px] text-ink-3">Source</td>
                {years.map((y) => (
                  <td key={String(y.year)} className="text-right text-[10.5px] text-ink-3">
                    {String(y.source)}
                    <br />
                    {date(String(y.updatedAt))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-5 pt-3 border-t border-[color:var(--line)]">
          <AddYear companyId={company.id} defaultYear={(h.lastYear ?? new Date().getFullYear() - 1) + 1} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <SectionTitle title="Revenue" hint="Reported, NOK" />
          <ColumnChart data={years} dataKey="revenue" name="Revenue" />
        </Card>
        <Card>
          <SectionTitle title="EBITDA" hint="Reported, NOK" />
          <ColumnChart data={years} dataKey="ebitda" name="EBITDA" color="var(--chart-3)" />
        </Card>
        <Card>
          <SectionTitle title="EBITDA margin" hint="Calculated, % of revenue" />
          <RatioChart data={years} dataKey="ebitdaMargin" name="EBITDA margin" />
        </Card>
        <Card>
          <SectionTitle title="Equity and total assets" hint="Reported equity, NOK" />
          <ColumnChart data={years} dataKey="equity" name="Equity" color="var(--chart-7)" />
        </Card>
        <Card>
          <SectionTitle title="Net debt" hint="Calculated: debt less cash, NOK" />
          <ColumnChart data={years} dataKey="netDebt" name="Net debt" color="var(--chart-2)" />
        </Card>
        <Card>
          <SectionTitle title="Revenue per employee" hint="Calculated, NOK" />
          <ColumnChart data={years} dataKey="revenuePerEmployee" name="Revenue per employee" color="var(--chart-4)" />
        </Card>
      </div>

      <Card>
        <SectionTitle
          title="Observations from the reported figures"
          hint="Generated from the registered data. Facts restate reported or calculated figures; interpretations are marked."
          right={<DataTag kind="AI" />}
        />
        <ul className="space-y-3 mt-3">
          {observations.map((s, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="mt-[3px] shrink-0">
                <DataTag kind={s.kind === "INTERPRETATION" ? "AI" : s.kind === "GAP" ? "GAP" : s.kind === "ASSUMPTION" ? "ASSUMPTION" : "RAW"} />
              </span>
              <span className="text-[12.5px] text-ink-2 leading-relaxed">{s.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
