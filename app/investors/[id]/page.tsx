import Link from "next/link";
import { notFound } from "next/navigation";
import { ScenarioChart } from "@/components/charts";
import { Bar, Card, Kpi, Logo, PageHeader, Pill, ScenarioNote, SectionTitle, Stat } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date, multiple, nok, pct, signedNok, toneOf } from "@/lib/format";
import { investorSummary } from "@/lib/portfolio";

export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const investor = store.investors.find((i) => i.id === id);
  if (!investor) notFound();

  const s = investorSummary(store, investor);
  const concentration = s.holdings.map((h) => ({ ...h, share: s.invested > 0 ? h.invested / s.invested : 0 }));

  return (
    <>
      <PageHeader
        eyebrow="Personal portfolio"
        title={investor.name}
        subtitle={`${investor.role}${investor.email ? ` · ${investor.email}` : ""} · joined ${date(investor.joinedAt)}${
          investor.vehicleOwnership > 0 ? ` · owns ${pct(investor.vehicleOwnership)} of ${store.vehicle.name}` : ""
        }`}
        actions={
          <Link href="/investors" className="text-[12px] underline text-ink-2 hover:text-ink">
            All investors
          </Link>
        }
      />

      <div className="label mb-2.5">Capital and current position</div>
      <div className="grid grid-cols-6 gap-3 mb-6">
        <Kpi label="Available capital" value={nok(investor.availableCapital)} tag="RAW" />
        <Kpi label="Committed" value={nok(investor.committedCapital)} tag="RAW" />
        <Kpi label="Invested" value={nok(s.invested)} sub={`${s.holdings.length} positions`} tag="CALCULATED" />
        <Kpi label="Remaining" value={nok(s.remaining)} sub="Available less invested" tag="CALCULATED" />
        <Kpi label="Current estimated value" value={nok(s.currentValue)} tag="CALCULATED" />
        <Kpi
          label="Unrealized gain / loss"
          value={signedNok(s.currentValue - s.invested)}
          tone={toneOf(s.currentValue - s.invested)}
          sub={`${multiple(s.moic)} MOIC`}
          tag="CALCULATED"
        />
      </div>

      <div className="label mb-2.5">Scenario values — assumptions, not forecasts</div>
      <div className="grid grid-cols-6 gap-3 mb-3">
        <Kpi label="Downside value" value={nok(s.downsideValue)} tag="ASSUMPTION" scenario />
        <Kpi label="Base case value" value={nok(s.baseValue)} sub={`${multiple(s.baseMoic)} MOIC`} tag="ASSUMPTION" scenario />
        <Kpi label="Upside value" value={nok(s.upsideValue)} tag="ASSUMPTION" scenario />
        <Kpi label="Downside profit / loss" value={signedNok(s.downsideProfit)} tone={toneOf(s.downsideProfit)} tag="ASSUMPTION" scenario />
        <Kpi label="Base case potential profit" value={signedNok(s.baseProfit)} tone={toneOf(s.baseProfit)} tag="ASSUMPTION" scenario />
        <Kpi label="Base IRR" value={pct(s.baseIrr)} sub="Single exit per position" tag="ASSUMPTION" scenario />
      </div>
      <div className="mb-7">
        <ScenarioNote />
      </div>

      <Card className="mb-4" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Holdings" hint="Attributable to this investor. Direct and vehicle holdings are shown separately." />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Structure</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Ownership</th>
                <th className="text-right">Current value</th>
                <th className="text-right">Downside</th>
                <th className="text-right">Base</th>
                <th className="text-right">Upside</th>
                <th className="text-right">Base profit</th>
                <th className="text-right">MOIC</th>
                <th className="text-right">Base IRR</th>
              </tr>
            </thead>
            <tbody>
              {s.holdings.map((h) => (
                <tr key={h.company.id + h.structure}>
                  <td>
                    <Link href={`/companies/${h.company.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Logo text={h.company.logoText} color={h.company.logoColor} size={26} />
                      <span className="text-[12.5px]">{h.company.name}</span>
                    </Link>
                  </td>
                  <td>
                    <Pill muted>{h.structure === "VEHICLE" ? store.vehicle.name : "Direct"}</Pill>
                  </td>
                  <td className="text-right num">{nok(h.invested)}</td>
                  <td className="text-right num">{pct(h.ownership, 3)}</td>
                  <td className="text-right num">{nok(h.currentValue)}</td>
                  <td className="text-right num text-ink-2">{nok(h.downsideValue)}</td>
                  <td className="text-right num text-ink-2">{nok(h.baseValue)}</td>
                  <td className="text-right num text-ink-2">{nok(h.upsideValue)}</td>
                  <td
                    className={`text-right num ${toneOf(h.baseProfit) === "pos" ? "text-[color:var(--pos)]" : toneOf(h.baseProfit) === "neg" ? "text-[color:var(--neg)]" : ""}`}
                  >
                    {signedNok(h.baseProfit)}
                  </td>
                  <td className="text-right num">{multiple(h.moic)}</td>
                  <td className="text-right num text-ink-2">{pct(h.baseIrr)}</td>
                </tr>
              ))}
              {!s.holdings.length ? (
                <tr>
                  <td colSpan={11} className="text-[12px] text-ink-3">
                    No capital allocated to this investor yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t border-[color:var(--line-strong)]">
                <td colSpan={2} className="text-[11px] text-ink-3">
                  Total
                </td>
                <td className="text-right num">{nok(s.invested)}</td>
                <td />
                <td className="text-right num">{nok(s.currentValue)}</td>
                <td className="text-right num text-ink-2">{nok(s.downsideValue)}</td>
                <td className="text-right num text-ink-2">{nok(s.baseValue)}</td>
                <td className="text-right num text-ink-2">{nok(s.upsideValue)}</td>
                <td className="text-right num">{signedNok(s.baseProfit)}</td>
                <td className="text-right num">{multiple(s.moic)}</td>
                <td className="text-right num text-ink-2">{pct(s.baseIrr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <SectionTitle title="Portfolio scenario outcomes" hint="This investor's attributable value in each scenario" />
          <ScenarioChart
            invested={s.invested}
            data={[
              { name: "Downside", value: s.downsideValue },
              { name: "Base", value: s.baseValue },
              { name: "Upside", value: s.upsideValue },
            ]}
          />
        </Card>

        <Card>
          <SectionTitle title="Concentration" hint="Share of this investor's deployed capital" />
          <div className="mt-4 space-y-3">
            {concentration.map((h) => (
              <div key={h.company.id + h.structure}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-[12px] text-ink-2 truncate">{h.company.name}</span>
                  <span className="num text-[11px] text-ink-3">{pct(h.share, 0)}</span>
                </div>
                <Bar share={h.share} />
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[color:var(--line)]">
            <Stat label="Invested directly" value={nok(s.directInvested)} />
            <Stat label={`Through ${store.vehicle.name}`} value={nok(s.vehicleInvested)} />
            <Stat label="Equity contributed to the vehicle" value={nok(investor.vehicleEquityContribution)} />
            <Stat label="Shareholder loan to the vehicle" value={nok(investor.vehicleShareholderLoan)} />
          </div>
        </Card>
      </div>
    </>
  );
}
