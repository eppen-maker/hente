import { PageHeader, ScenarioNote } from "@/components/ui";
import { readStore } from "@/lib/db";
import { latestYear, valuationMetrics } from "@/lib/finance";
import { buildPosition } from "@/lib/portfolio";
import { CompanyTable, type CompanyRow } from "./CompanyTable";
import { NewCompanyButton } from "./NewCompany";

export default function CompaniesPage() {
  const store = readStore();
  const rows: CompanyRow[] = store.companies.map((c) => {
    const fy = latestYear(c);
    const p = buildPosition(c, store.investments);
    const v = valuationMetrics(c);
    return {
      id: c.id,
      name: c.name,
      logoText: c.logoText,
      logoColor: c.logoColor,
      identifier: c.ticker ?? c.orgNr ?? "—",
      sector: c.sector,
      industry: c.industry,
      listing: c.listing,
      status: c.status,
      revenue: fy?.revenue ?? null,
      revenueGrowth: fy?.revenueGrowth ?? null,
      ebitda: fy?.ebitda ?? null,
      ebitdaMargin: fy?.ebitdaMargin ?? null,
      netIncome: fy?.netIncome ?? null,
      valuation: c.valuation.latestValuation ?? v.marketCap,
      invested: p.invested,
      ownership: p.ownership,
      currentValue: p.currentValue,
      baseValue: p.invested > 0 ? p.scenarios.base.valueOfPosition : null,
      upsideValue: p.invested > 0 ? p.scenarios.upside.valueOfPosition : null,
      baseMoic: p.invested > 0 ? p.scenarios.base.moic : null,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Universe"
        title="Companies"
        subtitle="Every company we hold, follow or have reviewed. Financial figures are the latest reported year; valuation is the latest known reference."
        actions={<NewCompanyButton />}
      />
      <CompanyTable rows={rows} />
      <div className="mt-4 max-w-3xl">
        <ScenarioNote />
      </div>
    </>
  );
}
