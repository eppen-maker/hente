import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, ScenarioNote, SectionTitle, Stat } from "@/components/ui";
import { compareSnapshot } from "@/lib/analysis";
import { readStore } from "@/lib/db";
import { latestYear } from "@/lib/finance";
import { date, nok, pct } from "@/lib/format";
import { buildPosition } from "@/lib/portfolio";
import { ScenarioEditor } from "./ScenarioLab";

export default async function ScenariosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const fy = latestYear(company);
  const p = buildPosition(company, store.investments);
  const snapshotInvestment = p.investments.find((i) => i.snapshot);
  const comparison = snapshotInvestment ? compareSnapshot(company, snapshotInvestment) : [];

  return (
    <>
      <div className="mb-5 max-w-3xl">
        <ScenarioNote>
          Downside, base and upside are sensitivity analyses built on the assumptions below. They are not forecasts and not
          guaranteed outcomes. Current value is shown separately on the Valuation tab.
        </ScenarioNote>
      </div>

      <ScenarioEditor
        companyId={company.id}
        initial={company.scenarios}
        baseRevenue={fy?.revenue ?? null}
        baseYear={fy?.year ?? new Date().getFullYear()}
        ownership={p.ownership}
        invested={p.invested}
      />

      {snapshotInvestment?.snapshot ? (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="col-span-2" padded={false}>
            <div className="p-5 pb-2">
              <SectionTitle
                title="What we expected vs what happened"
                hint={`Frozen investment case from ${date(snapshotInvestment.snapshot.investmentDate)}, compared with the latest reported figures.`}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Expected at entry</th>
                  <th>Actual</th>
                  <th className="text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.label}>
                    <td className="text-[12.5px]">{row.label}</td>
                    <td className="text-[12px] text-ink-2 num">{row.expected}</td>
                    <td className="text-[12px] num">{row.actual}</td>
                    <td className="text-right num text-[12px]">{row.delta ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
              The snapshot is frozen — editing today&apos;s assumptions does not change what we wrote at entry.
            </div>
          </Card>

          <Card>
            <SectionTitle title="Investment snapshot" hint="Frozen at the investment decision" />
            <div className="mt-1">
              <Stat label="Investment date" value={date(snapshotInvestment.snapshot.investmentDate)} />
              <Stat label="Amount" value={nok(snapshotInvestment.snapshot.amount)} />
              <Stat label="Entry valuation" value={nok(snapshotInvestment.snapshot.entryValuation)} />
              <Stat label="Ownership" value={pct(snapshotInvestment.snapshot.ownershipPct, 2)} />
              <Stat label="Revenue at entry" value={nok(snapshotInvestment.snapshot.revenueAtEntry)} />
              <Stat label="EBITDA at entry" value={nok(snapshotInvestment.snapshot.ebitdaAtEntry)} />
              <Stat label="Base growth assumed" value={pct(snapshotInvestment.snapshot.assumptions.base.revenueGrowth, 0)} />
              <Stat label="Base exit multiple assumed" value={`${snapshotInvestment.snapshot.assumptions.base.exitMultiple}x`} />
            </div>
            <div className="label mt-4 mb-1.5">Thesis at entry</div>
            <p className="text-[11.5px] text-ink-2 leading-relaxed">{snapshotInvestment.snapshot.thesisAtEntry || "Not registered."}</p>
          </Card>
        </div>
      ) : (
        <div className="card p-5 mt-4 text-[12px] text-ink-3">
          No frozen investment case registered for this company yet. A snapshot is written automatically when an investment is
          registered in <Link href={`/allocate?company=${company.id}`} className="underline">Allocate investment</Link>.
        </div>
      )}
    </>
  );
}
