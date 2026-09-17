import Link from "next/link";
import { Bar, Card, Kpi, PageHeader, ScenarioNote, SectionTitle, Stat } from "@/components/ui";
import { readStore } from "@/lib/db";
import { multiple, nok, pct, signedNok, toneOf } from "@/lib/format";
import { allInvestorSummaries, portfolioTotals } from "@/lib/portfolio";
import { NewInvestorButton } from "./NewInvestor";

export default function InvestorsPage() {
  const store = readStore();
  const summaries = allInvestorSummaries(store);
  const totals = portfolioTotals(store);
  const vehicleOwnershipTotal = store.investors.reduce((s, i) => s + i.vehicleOwnership, 0);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Investors"
        subtitle="Capital, positions and scenario outcomes per person. Direct holdings and holdings through the investment company are calculated separately and never mixed."
        actions={<NewInvestorButton />}
      />

      <div className="grid grid-cols-5 gap-3 mb-6">
        <Kpi label="Total capital" value={nok(totals.totalCapital)} sub={`${store.investors.length} investors`} tag="RAW" />
        <Kpi label="Committed" value={nok(totals.committedCapital)} tag="RAW" />
        <Kpi label="Invested" value={nok(totals.invested)} tag="CALCULATED" />
        <Kpi label="Remaining" value={nok(totals.totalCapital - totals.invested)} tag="CALCULATED" />
        <Kpi label="Current estimated value" value={nok(totals.currentValue)} sub={`${multiple(totals.moic)} MOIC`} tag="CALCULATED" />
      </div>

      <Card className="mb-4" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Investors" hint="Click an investor for their personal portfolio" />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th className="text-right">Available</th>
                <th className="text-right">Committed</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Remaining</th>
                <th className="text-right">Current value</th>
                <th className="text-right">Base value</th>
                <th className="text-right">Upside value</th>
                <th className="text-right">Base profit</th>
                <th className="text-right">MOIC</th>
                <th className="text-right">Base IRR</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.investor.id}>
                  <td>
                    <Link href={`/investors/${s.investor.id}`} className="hover:underline">
                      <span className="block text-[12.5px]">{s.investor.name}</span>
                      <span className="block text-[10.5px] text-ink-3">
                        {s.investor.role}
                        {s.investor.vehicleOwnership > 0 ? ` · ${pct(s.investor.vehicleOwnership, 0)} of ${store.vehicle.name}` : " · direct only"}
                      </span>
                    </Link>
                  </td>
                  <td className="text-right num">{nok(s.investor.availableCapital)}</td>
                  <td className="text-right num">{nok(s.investor.committedCapital)}</td>
                  <td className="text-right num">{nok(s.invested)}</td>
                  <td className="text-right num">{nok(s.remaining)}</td>
                  <td className="text-right num">{nok(s.currentValue)}</td>
                  <td className="text-right num text-ink-2">{nok(s.baseValue)}</td>
                  <td className="text-right num text-ink-2">{nok(s.upsideValue)}</td>
                  <td
                    className={`text-right num ${toneOf(s.baseProfit) === "pos" ? "text-[color:var(--pos)]" : toneOf(s.baseProfit) === "neg" ? "text-[color:var(--neg)]" : ""}`}
                  >
                    {signedNok(s.baseProfit)}
                  </td>
                  <td className="text-right num">{multiple(s.moic)}</td>
                  <td className="text-right num text-ink-2">{pct(s.baseIrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
          Base value, upside value, base profit and base IRR are scenario outputs from our assumptions. MOIC is measured on the
          current estimated value.
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <SectionTitle
            title={`Ownership structure — ${store.vehicle.name}`}
            hint="Structure B: the investors own the investment company, which owns the shares in the portfolio companies."
          />
          <div className="mt-4 space-y-3.5">
            {store.investors
              .filter((i) => i.vehicleOwnership > 0)
              .map((i) => (
                <div key={i.id}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px]">{i.name}</span>
                    <span className="num text-[11.5px] text-ink-3">
                      {pct(i.vehicleOwnership)} · equity {nok(i.vehicleEquityContribution)}
                      {i.vehicleShareholderLoan > 0 ? ` · loan ${nok(i.vehicleShareholderLoan)}` : ""}
                    </span>
                  </div>
                  <Bar share={i.vehicleOwnership} />
                </div>
              ))}
            {vehicleOwnershipTotal < 0.999 ? (
              <div className="text-[11px] text-ink-3 pt-2">
                Registered ownership adds up to {pct(vehicleOwnershipTotal)}. The remainder is not registered.
              </div>
            ) : null}
          </div>
          <div className="mt-5 pt-4 border-t border-[color:var(--line)] grid grid-cols-3 gap-6">
            <div>
              <div className="label mb-1.5">Vehicle capital available</div>
              <div className="num text-[15px]">{nok(store.vehicle.availableCapital)}</div>
            </div>
            <div>
              <div className="label mb-1.5">Invested through the vehicle</div>
              <div className="num text-[15px]">
                {nok(store.investments.filter((i) => i.structure === "VEHICLE").reduce((s, i) => s + i.amount, 0))}
              </div>
            </div>
            <div>
              <div className="label mb-1.5">Invested directly</div>
              <div className="num text-[15px]">
                {nok(store.investments.filter((i) => i.structure === "DIRECT").reduce((s, i) => s + i.amount, 0))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="How attribution works" />
          <div className="mt-1">
            <Stat label="Structure A — direct" value="Allocation per transaction" />
            <Stat label="Structure B — vehicle" value="Ownership of the vehicle" />
          </div>
          <p className="text-[11.5px] text-ink-2 leading-relaxed mt-4">
            For a direct investment, an investor&apos;s share is the amount they put into that specific transaction. For an
            investment made through {store.vehicle.name}, the value of the vehicle&apos;s position is calculated first, and each
            shareholder&apos;s attributable value follows from their ownership of the vehicle. The two are never combined into a
            single ownership figure.
          </p>
          <div className="mt-4">
            <ScenarioNote />
          </div>
        </Card>
      </div>
    </>
  );
}
