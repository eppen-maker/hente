import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { readStore } from "@/lib/db";
import { latestYear } from "@/lib/finance";
import { investorSummary } from "@/lib/portfolio";
import { Allocator, type AllocCompany, type AllocInvestor } from "./Allocator";

export default function AllocatePage() {
  const store = readStore();

  const companies: AllocCompany[] = store.companies
    .filter((c) => c.status !== "PASSED")
    .map((c) => {
      const fy = latestYear(c);
      const invs = store.investments.filter((i) => i.companyId === c.id);
      return {
        id: c.id,
        name: c.name,
        valuation: c.valuation.latestValuation ?? (c.valuation.sharePrice && c.valuation.sharesOutstanding ? c.valuation.sharePrice * c.valuation.sharesOutstanding : null),
        latestRevenue: fy?.revenue ?? null,
        latestYear: fy?.year ?? new Date().getFullYear(),
        scenarios: c.scenarios,
        existingInvested: invs.reduce((s, i) => s + i.amount, 0),
        existingOwnership: invs.reduce((s, i) => s + i.ownershipPct, 0),
      };
    });

  const investors: AllocInvestor[] = store.investors.map((i) => ({
    id: i.id,
    name: i.name,
    available: i.availableCapital,
    invested: investorSummary(store, i).invested,
    vehicleOwnership: i.vehicleOwnership,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Decision tool"
        title="Allocate investment"
        subtitle="Split a proposed investment between the investors and see what each person's share is worth in each scenario. Registering the investment freezes a snapshot of the case."
      />
      <Suspense fallback={<div className="text-[12px] text-ink-3">Loading…</div>}>
        <Allocator
          companies={companies}
          investors={investors}
          vehicleName={store.vehicle.name}
          vehicleCapital={store.vehicle.availableCapital}
        />
      </Suspense>
    </>
  );
}
