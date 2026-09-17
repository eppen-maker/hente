import { notFound } from "next/navigation";
import { Card, DataTag, Kpi, SectionTitle, Stat } from "@/components/ui";
import { readStore } from "@/lib/db";
import { latestYear, valuationMetrics } from "@/lib/finance";
import { date, multiple, nok, pct } from "@/lib/format";
import { buildPosition } from "@/lib/portfolio";
import { ValuationAssumptions } from "./Assumptions";

export default async function ValuationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const v = valuationMetrics(company);
  const fy = latestYear(company);
  const p = buildPosition(company, store.investments);
  const listed = company.listing === "LISTED";

  return (
    <>
      <div className="grid grid-cols-6 gap-3 mb-6">
        {listed ? (
          <>
            <Kpi label="Share price" value={company.valuation.sharePrice !== null ? `NOK ${company.valuation.sharePrice}` : "DATA UNAVAILABLE"} sub={company.valuation.period} tag="RAW" />
            <Kpi label="Market cap" value={nok(v.marketCap)} tag="CALCULATED" />
            <Kpi label="Enterprise value" value={nok(v.enterpriseValue)} sub={`Net debt ${nok(company.valuation.netDebt)}`} tag="CALCULATED" />
            <Kpi label="P/E" value={multiple(v.pe)} tag="CALCULATED" />
            <Kpi label="EV/EBITDA" value={multiple(v.evEbitda)} tag="CALCULATED" />
            <Kpi label="EV/Revenue" value={multiple(v.evRevenue)} tag="CALCULATED" />
            <Kpi label="Price / Sales" value={multiple(v.priceSales)} tag="CALCULATED" />
            <Kpi label="Price / Book" value={multiple(v.priceBook)} tag="CALCULATED" />
            <Kpi label="FCF yield (approx.)" value={pct(v.fcfYield)} sub="EBITDA less 25% tax/capex drag" tag="CALCULATED" />
            <Kpi label="Entry valuation" value={nok(company.valuation.entryValuation)} tag="RAW" />
            <Kpi label="Our ownership" value={pct(p.ownership, 3)} tag="CALCULATED" />
            <Kpi label="Current value of position" value={nok(p.currentValue)} tag="CALCULATED" />
          </>
        ) : (
          <>
            <Kpi label="Latest known valuation" value={nok(company.valuation.latestValuation)} sub={company.valuation.source} tag="RAW" />
            <Kpi label="Entry valuation" value={nok(company.valuation.entryValuation)} sub="Weighted average of our entries" tag="RAW" />
            <Kpi label="Enterprise value" value={nok(v.enterpriseValue)} tag="CALCULATED" />
            <Kpi label="EV/Revenue" value={multiple(v.evRevenue)} tag="CALCULATED" />
            <Kpi label="EV/EBITDA" value={multiple(v.evEbitda)} tag="CALCULATED" />
            <Kpi label="P/E" value={multiple(v.pe)} tag="CALCULATED" />
            <Kpi
              label="Comparable valuation"
              value={nok(company.valuation.comparableEvEbitda !== null && fy?.ebitda ? company.valuation.comparableEvEbitda * fy.ebitda : null)}
              sub={`${multiple(company.valuation.comparableEvEbitda)} EV/EBITDA assumption`}
              tag="ASSUMPTION"
            />
            <Kpi
              label="Potential exit valuation (base)"
              value={nok(p.scenarios.base.companyValue)}
              sub={`${multiple(company.scenarios.base.exitMultiple)} in ${company.scenarios.base.exitYear}`}
              tag="ASSUMPTION"
              scenario
            />
            <Kpi label="Our ownership" value={pct(p.ownership, 2)} tag="CALCULATED" />
            <Kpi label="Current value of position" value={nok(p.currentValue)} tag="CALCULATED" />
            <Kpi label="Value change since entry" value={pct(p.averageEntryValuation && p.companyValue ? p.companyValue / p.averageEntryValuation - 1 : null)} tag="CALCULATED" />
            <Kpi label="Last valuation update" value={date(company.valuation.updatedAt)} tag="RAW" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <SectionTitle title="Valuation inputs" hint="Every input can be changed manually" right={<DataTag kind="ASSUMPTION" />} />
          <ValuationAssumptions
            companyId={company.id}
            listing={company.listing}
            initial={{
              latestValuation: company.valuation.latestValuation,
              entryValuation: company.valuation.entryValuation,
              sharePrice: company.valuation.sharePrice,
              sharesOutstanding: company.valuation.sharesOutstanding,
              netDebt: company.valuation.netDebt,
              comparableEvEbitda: company.valuation.comparableEvEbitda,
              comparableEvRevenue: company.valuation.comparableEvRevenue,
              source: company.valuation.source,
            }}
            latestRevenue={fy?.revenue ?? null}
            latestEbitda={fy?.ebitda ?? null}
          />
        </Card>

        <Card>
          <SectionTitle title="Underlying figures" hint={`Reported ${fy?.period ?? "—"} · ${fy?.source ?? "—"}`} right={<DataTag kind="RAW" />} />
          <div className="mt-1">
            <Stat label="Revenue" value={nok(fy?.revenue ?? null)} />
            <Stat label="EBITDA" value={nok(fy?.ebitda ?? null)} />
            <Stat label="Operating profit" value={nok(fy?.operatingProfit ?? null)} />
            <Stat label="Net income" value={nok(fy?.netIncome ?? null)} />
            <Stat label="Equity" value={nok(fy?.equity ?? null)} />
            <Stat label="Debt" value={nok(fy?.debt ?? null)} />
            <Stat label="Cash" value={nok(fy?.cash ?? null)} />
            <Stat label="Net debt" value={nok(fy?.netDebt ?? null)} />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Valuation bridge" hint="How the current estimated value of our position is built" />
          <div className="mt-1">
            <Stat label="Company equity value" value={nok(p.companyValue)} />
            <Stat label="× our ownership" value={pct(p.ownership, 3)} />
            <Stat label="= current estimated value" value={nok(p.currentValue)} />
            <Stat label="− invested" value={nok(p.invested)} />
            <Stat label="= unrealized gain / loss" value={nok(p.unrealised)} tone={p.unrealised !== null && p.unrealised < 0 ? "neg" : "pos"} />
          </div>
          <p className="text-[11px] text-ink-3 mt-4 leading-relaxed">
            Current estimated value uses the latest known valuation reference only. It contains no growth assumption and no
            scenario. Scenario values live on the Scenarios tab and are never mixed into this number.
          </p>
        </Card>
      </div>
    </>
  );
}
