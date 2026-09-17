import { notFound } from "next/navigation";
import Link from "next/link";
import { ColumnChart, ScenarioChart } from "@/components/charts";
import { Card, DataTag, Kpi, Pill, ScenarioNote, SectionTitle, Stat } from "@/components/ui";
import { readStore } from "@/lib/db";
import { deriveYears, latestYear, summariseHistory, valuationMetrics } from "@/lib/finance";
import { compact, date, multiple, negTone, nok, pct, signedNok, toneOf } from "@/lib/format";
import { buildPosition } from "@/lib/portfolio";

export default async function CompanyOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const fy = latestYear(company);
  const h = summariseHistory(company.financials);
  const v = valuationMetrics(company);
  const p = buildPosition(company, store.investments);
  const years = deriveYears(company.financials);
  const period = fy ? fy.period : "—";

  return (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <div className="label">Key figures — {period} (reported)</div>
        <div className="text-[10.5px] text-ink-3">
          Source: {fy?.source ?? "—"} · last updated {date(fy?.updatedAt)}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 mb-7">
        <Kpi label="Revenue" value={nok(fy?.revenue ?? null)} tag="RAW" />
        <Kpi
          label="Revenue growth"
          value={pct(fy?.revenueGrowth ?? null)}
          tone={toneOf(fy?.revenueGrowth ?? null)}
          sub={`CAGR ${pct(h.revenueCagr)} over ${h.years}y`}
          tag="CALCULATED"
        />
        <Kpi label="EBITDA" value={nok(fy?.ebitda ?? null)} tone={negTone(fy?.ebitda ?? null)} tag="RAW" />
        <Kpi label="EBITDA margin" value={pct(fy?.ebitdaMargin ?? null)} tag="CALCULATED" />
        <Kpi label="Operating profit" value={nok(fy?.operatingProfit ?? null)} tone={negTone(fy?.operatingProfit ?? null)} tag="RAW" />
        <Kpi label="Net income" value={nok(fy?.netIncome ?? null)} tone={negTone(fy?.netIncome ?? null)} tag="RAW" />
        <Kpi label="Equity" value={nok(fy?.equity ?? null)} sub={`Equity ratio ${pct(fy?.equityRatio ?? null)}`} tag="RAW" />
        <Kpi label="Debt" value={nok(fy?.debt ?? null)} tag="RAW" />
        <Kpi label="Cash" value={nok(fy?.cash ?? null)} tag="RAW" />
        <Kpi label="Employees" value={fy?.employees !== null && fy?.employees !== undefined ? String(fy.employees) : "DATA UNAVAILABLE"} tag="RAW" />
        <Kpi label="Valuation" value={nok(company.valuation.latestValuation ?? v.marketCap)} sub={company.valuation.source} tag="RAW" />
        <Kpi label="Enterprise value" value={nok(v.enterpriseValue)} sub={`EV/EBITDA ${multiple(v.evEbitda)}`} tag="CALCULATED" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2">
          <SectionTitle
            title="Revenue and EBITDA"
            hint={`Reported ${h.firstYear}–${h.lastYear}. Revenue CAGR ${pct(h.revenueCagr)}, EBITDA CAGR ${pct(h.ebitdaCagr)}.`}
            right={<Link href={`/companies/${company.id}/financials`} className="text-[11.5px] underline text-ink-3 hover:text-ink">Full history →</Link>}
          />
          <div className="grid grid-cols-2 gap-6 mt-2">
            <div>
              <div className="label mb-2">Revenue</div>
              <ColumnChart data={years as unknown as Record<string, unknown>[]} dataKey="revenue" name="Revenue" color="var(--chart-1)" />
            </div>
            <div>
              <div className="label mb-2">EBITDA</div>
              <ColumnChart data={years as unknown as Record<string, unknown>[]} dataKey="ebitda" name="EBITDA" color="var(--chart-3)" />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Our position" hint={p.invested > 0 ? "Registered investments in this company" : "We have not invested"} />
          {p.invested > 0 ? (
            <div className="mt-1">
              <Stat label="Invested" value={nok(p.invested)} />
              <Stat label="Ownership" value={pct(p.ownership, 2)} />
              <Stat label="Average entry valuation" value={nok(p.averageEntryValuation)} />
              <Stat label="Latest company valuation" value={nok(p.companyValue)} />
              <Stat label="Current estimated value" value={nok(p.currentValue)} />
              <Stat
                label="Unrealized gain / loss"
                value={signedNok(p.unrealised)}
                tone={toneOf(p.unrealised)}
              />
              <Stat label="Current MOIC" value={multiple(p.currentMoic)} />
              <Stat label="Holding period" value={`${p.holdingYears.toFixed(1)} years`} />
              <Stat label="Structure" value={p.structures.map((s) => (s === "VEHICLE" ? store.vehicle.name : "Direct")).join(" + ")} />
              <div className="mt-4 flex gap-2">
                <Link href={`/allocate?company=${company.id}`} className="text-[11.5px] underline text-ink-2 hover:text-ink">
                  Add follow-on →
                </Link>
                <Link href={`/companies/${company.id}/scenarios`} className="text-[11.5px] underline text-ink-2 hover:text-ink">
                  Scenarios →
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-ink-2 leading-relaxed">
              No capital deployed. Latest known valuation is {nok(company.valuation.latestValuation ?? v.marketCap)} (
              {company.valuation.source}).
              <div className="mt-3">
                <Link href={`/sizing?company=${company.id}`} className="text-[12px] underline">
                  Test investment sizes →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2">
          <SectionTitle
            title="Scenario values"
            hint={
              p.invested > 0
                ? `Our ${nok(p.invested)} at ${pct(p.ownership, 2)} ownership, exit ${company.scenarios.base.exitYear}`
                : "No position — scenarios shown for reference only"
            }
            right={<DataTag kind="ASSUMPTION" />}
          />
          <ScenarioChart
            invested={p.invested}
            data={[
              { name: "Downside", value: p.scenarios.downside.valueOfPosition },
              { name: "Base", value: p.scenarios.base.valueOfPosition },
              { name: "Upside", value: p.scenarios.upside.valueOfPosition },
            ]}
          />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {(["downside", "base", "upside"] as const).map((k) => {
              const r = p.scenarios[k];
              return (
                <div key={k} className="border border-dashed rounded-[3px] p-3">
                  <div className="label mb-2">{k}</div>
                  <Stat label="Value" value={nok(r.valueOfPosition)} />
                  <Stat label="Profit" value={signedNok(r.profit)} tone={toneOf(r.profit)} />
                  <Stat label="MOIC" value={multiple(r.moic)} />
                  <Stat label="IRR" value={pct(r.irr)} />
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <ScenarioNote />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Recent developments" hint="Registered events for this company" />
          <div className="mt-3 space-y-3.5">
            {company.updates.length ? (
              company.updates.map((u, i) => (
                <div key={i} className="pb-3.5 border-b border-[color:var(--line)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="num text-[10.5px] text-ink-3">{date(u.date)}</span>
                    <Pill muted>{u.kind.replace("_", " ").toLowerCase()}</Pill>
                  </div>
                  <div className="text-[12.5px] leading-snug">{u.title}</div>
                  {u.detail ? <div className="text-[11px] text-ink-2 mt-1">{u.detail}</div> : null}
                  <div className="text-[10.5px] text-ink-3 mt-1">Source: {u.source}</div>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-ink-3">No updates registered.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <SectionTitle title="Business model" />
          <p className="text-[12.5px] text-ink-2 leading-relaxed">{company.qualitative.businessModel || "Not registered."}</p>
          <div className="label mt-4 mb-1.5">Customers</div>
          <p className="text-[12px] text-ink-2 leading-relaxed">{company.qualitative.customers || "Not registered."}</p>
        </Card>
        <Card>
          <SectionTitle title="Competitive advantages" />
          <ul className="space-y-2">
            {company.qualitative.moat.length ? (
              company.qualitative.moat.map((m, i) => (
                <li key={i} className="text-[12px] text-ink-2 leading-relaxed pl-3 border-l border-[color:var(--line-strong)]">
                  {m}
                </li>
              ))
            ) : (
              <li className="text-[12px] text-ink-3">Not registered.</li>
            )}
          </ul>
        </Card>
        <Card>
          <SectionTitle title="Key risks" />
          <ul className="space-y-2">
            {company.qualitative.risks.length ? (
              company.qualitative.risks.map((m, i) => (
                <li key={i} className="text-[12px] text-ink-2 leading-relaxed pl-3 border-l border-[color:var(--neg)]">
                  {m}
                </li>
              ))
            ) : (
              <li className="text-[12px] text-ink-3">Not registered.</li>
            )}
          </ul>
        </Card>
        <Card>
          <SectionTitle title="Management" />
          <div className="space-y-3">
            {company.management.length ? (
              company.management.map((m) => (
                <div key={m.name}>
                  <div className="text-[12.5px]">{m.name}</div>
                  <div className="text-[11px] text-ink-3">{m.role}</div>
                  {m.background ? <div className="text-[11px] text-ink-2 mt-1 leading-relaxed">{m.background}</div> : null}
                </div>
              ))
            ) : (
              <div className="text-[12px] text-ink-3">Not registered.</div>
            )}
          </div>
          <div className="label mt-4 mb-1.5">Revenue per employee</div>
          <div className="num text-[13px]">{compact(fy?.revenuePerEmployee ?? null)}</div>
        </Card>
      </div>
    </>
  );
}
