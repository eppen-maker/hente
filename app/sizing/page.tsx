import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { readStore } from "@/lib/db";
import { latestYear } from "@/lib/finance";
import { portfolioTotals } from "@/lib/portfolio";
import { Sizing, type SizingCompany } from "./Sizing";

export default function SizingPage() {
  const store = readStore();
  const totals = portfolioTotals(store);

  const companies: SizingCompany[] = store.companies
    .filter((c) => c.status !== "PASSED")
    .map((c) => {
      const fy = latestYear(c);
      return {
        id: c.id,
        name: c.name,
        valuation:
          c.valuation.latestValuation ??
          (c.valuation.sharePrice && c.valuation.sharesOutstanding ? c.valuation.sharePrice * c.valuation.sharesOutstanding : null),
        latestRevenue: fy?.revenue ?? null,
        latestYear: fy?.year ?? new Date().getFullYear(),
        scenarios: c.scenarios,
        existingInvested: store.investments.filter((i) => i.companyId === c.id).reduce((s, i) => s + i.amount, 0),
      };
    });

  return (
    <>
      <PageHeader
        eyebrow="Decision tool"
        title="How much should we invest?"
        subtitle="Capital allocation sensitivity: what different investment sizes do to ownership, concentration, remaining capital and scenario outcomes."
      />
      <Suspense fallback={<div className="text-[12px] text-ink-3">Loading…</div>}>
        <Sizing
          companies={companies}
          totalCapital={totals.totalCapital}
          deployed={totals.invested}
          available={totals.available}
        />
      </Suspense>
    </>
  );
}
