import { notFound } from "next/navigation";
import { Bar, Card, Kpi, SectionTitle, Stat } from "@/components/ui";
import { readStore } from "@/lib/db";
import { compact, date, multiple, nok, num, pct, signedNok } from "@/lib/format";
import { buildPosition } from "@/lib/portfolio";
import { toneOf } from "@/lib/format";

export default async function CapTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const p = buildPosition(company, store.investments);
  const totalShares = company.capTable.reduce((s, x) => s + x.shares, 0);
  const equityValue = p.companyValue;

  return (
    <>
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Kpi label="Our ownership" value={pct(p.ownership, 2)} sub={`${company.capTable.find((s) => s.isUs)?.shares ? num(company.capTable.find((s) => s.isUs)!.shares) + " shares" : "Registered from investments"}`} tag="CALCULATED" />
        <Kpi label="Our investment" value={nok(p.invested)} sub={`${p.investments.length} transactions`} tag="RAW" />
        <Kpi label="Average entry valuation" value={nok(p.averageEntryValuation)} tag="CALCULATED" />
        <Kpi label="Current estimated value" value={nok(p.currentValue)} sub={signedNok(p.unrealised) + " unrealized"} tone={toneOf(p.unrealised)} tag="CALCULATED" />
        <Kpi label="Potential base value" value={nok(p.scenarios.base.valueOfPosition)} sub={`${multiple(p.scenarios.base.moic)} MOIC`} tag="ASSUMPTION" scenario />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2" padded={false}>
          <div className="p-5 pb-2">
            <SectionTitle
              title="Cap table"
              hint={totalShares ? `${num(totalShares)} shares registered. Estimated value uses the latest known equity value of ${nok(equityValue)}.` : "No cap table registered."}
            />
          </div>
          <table>
            <thead>
              <tr>
                <th>Shareholder</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Ownership</th>
                <th className="text-right">Estimated value</th>
                <th className="w-[160px]"></th>
              </tr>
            </thead>
            <tbody>
              {company.capTable.map((s) => {
                const share = totalShares > 0 ? s.shares / totalShares : 0;
                return (
                  <tr key={s.name}>
                    <td className={s.isUs ? "text-[12.5px] font-medium" : "text-[12.5px]"}>
                      {s.name}
                      {s.isUs ? <span className="ml-2 text-[10px] text-[color:var(--accent)]">US</span> : null}
                    </td>
                    <td className="text-right num">{num(s.shares)}</td>
                    <td className="text-right num">{pct(share, 2)}</td>
                    <td className="text-right num">{equityValue !== null ? nok(equityValue * share) : "DATA UNAVAILABLE"}</td>
                    <td>
                      <Bar share={share} color={s.isUs ? "var(--chart-1)" : "var(--line-strong)"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionTitle title="Our transactions" hint="Each registered investment in this company" />
          <div className="mt-1">
            {p.investments.map((i) => (
              <div key={i.id} className="py-3 border-b border-[color:var(--line)] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px]">{i.type === "FOLLOW_ON" ? "Follow-on" : "Initial"}</span>
                  <span className="num text-[12.5px]">{nok(i.amount)}</span>
                </div>
                <div className="text-[11px] text-ink-3 mt-1">
                  {date(i.date)} · {pct(i.ownershipPct, 2)} at {compact(i.entryValuation)} pre-money ·{" "}
                  {i.structure === "VEHICLE" ? store.vehicle.name : "Direct"}
                </div>
                {i.note ? <div className="text-[11px] text-ink-2 mt-1">{i.note}</div> : null}
              </div>
            ))}
            {!p.investments.length ? <div className="text-[12px] text-ink-3 py-2">No investments registered.</div> : null}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card padded={false}>
          <div className="p-5 pb-2">
            <SectionTitle title="Funding rounds" hint="Registered rounds and the valuations they were done at" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Date</th>
                <th className="text-right">Pre-money</th>
                <th className="text-right">Raised</th>
                <th className="text-right">Post-money</th>
              </tr>
            </thead>
            <tbody>
              {company.fundingRounds.length ? (
                company.fundingRounds.map((r) => (
                  <tr key={r.name + r.date}>
                    <td className="text-[12.5px]">
                      {r.name}
                      {r.note ? <div className="text-[10.5px] text-ink-3">{r.note}</div> : null}
                    </td>
                    <td className="num text-[11.5px] text-ink-2">{date(r.date)}</td>
                    <td className="text-right num">{nok(r.preMoney)}</td>
                    <td className="text-right num">{nok(r.raised)}</td>
                    <td className="text-right num">
                      {r.preMoney !== null && r.raised !== null ? nok(r.preMoney + r.raised) : "DATA UNAVAILABLE"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-[12px] text-ink-3">
                    No funding rounds registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionTitle title="Dilution" hint="Assumed dilution until exit, by scenario (our assumption)" />
          <div className="mt-1">
            {(["downside", "base", "upside"] as const).map((k) => (
              <Stat
                key={k}
                label={`${k[0].toUpperCase()}${k.slice(1)} — ${pct(company.scenarios[k].dilution, 0)} dilution`}
                value={`${pct(p.ownership, 2)} → ${pct(p.scenarios[k].ownershipAtExit, 2)}`}
              />
            ))}
            <Stat label="Future capital need assumed (base)" value={nok(company.scenarios.base.futureCapitalNeed)} />
          </div>
          <p className="text-[11px] text-ink-3 mt-4 leading-relaxed">
            Historical ownership changes are derived from the registered funding rounds and our own transactions. Where a round
            is not registered, the dilution it caused is not reflected here.
          </p>
        </Card>
      </div>
    </>
  );
}
