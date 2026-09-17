import { PageHeader } from "@/components/ui";
import { readStore } from "@/lib/db";
import { latestYear } from "@/lib/finance";
import { Lab, type LabCompany, type LabInvestor } from "./Lab";

export default function ScenarioLabPage() {
  const store = readStore();

  const companies: LabCompany[] = store.companies
    .filter((c) => c.status !== "PASSED")
    .map((c) => {
      const fy = latestYear(c);
      return {
        id: c.id,
        name: c.name,
        sector: c.sector,
        valuation:
          c.valuation.latestValuation ??
          (c.valuation.sharePrice && c.valuation.sharesOutstanding ? c.valuation.sharePrice * c.valuation.sharesOutstanding : null),
        latestRevenue: fy?.revenue ?? null,
        latestYear: fy?.year ?? new Date().getFullYear(),
        scenarios: c.scenarios,
      };
    });

  const investors: LabInvestor[] = store.investors.map((i) => ({
    id: i.id,
    name: i.name,
    available: i.availableCapital,
    vehicleOwnership: i.vehicleOwnership,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Decision tool"
        title="Portfolio scenario lab"
        subtitle="Test the whole portfolio at once: deploy capital across several companies and see the combined downside, base and upside outcome, for the portfolio and per investor."
      />
      <Lab
        companies={companies}
        investors={investors}
        initialCapital={store.lab.totalCapital}
        initialPositions={store.lab.positions.filter((p) => companies.some((c) => c.id === p.companyId))}
        vehicleName={store.vehicle.name}
      />
    </>
  );
}
