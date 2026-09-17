"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, DataTag, ScenarioNote, SectionTitle } from "@/components/ui";
import { impliedOwnership, projectScenario } from "@/lib/finance";
import { compact, multiple, nok, pct, signedNok } from "@/lib/format";
import type { ScenarioSet } from "@/lib/types";

export interface SizingCompany {
  id: string;
  name: string;
  valuation: number | null;
  latestRevenue: number | null;
  latestYear: number;
  scenarios: ScenarioSet;
  existingInvested: number;
}

const PRESETS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000];

export function Sizing({
  companies,
  totalCapital,
  deployed,
  available,
}: {
  companies: SizingCompany[];
  totalCapital: number;
  deployed: number;
  available: number;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const [companyId, setCompanyId] = useState(
    companies.find((c) => c.id === search.get("company"))?.id ?? companies[0]?.id ?? "",
  );
  const [custom, setCustom] = useState<number>(750_000);
  const company = companies.find((c) => c.id === companyId);
  const amounts = useMemo(() => [...PRESETS, custom].filter((a) => a > 0).sort((a, b) => a - b), [custom]);

  const rows = useMemo(() => {
    if (!company) return [];
    return amounts.map((amount) => {
      const preMoney = company.valuation ?? 0;
      const ownership = impliedOwnership(amount, preMoney);
      const project = (k: "downside" | "base" | "upside") =>
        projectScenario(k, company.scenarios[k], company.latestRevenue, ownership, amount, company.latestYear);
      const base = project("base");
      const positionTotal = company.existingInvested + amount;
      return {
        amount,
        ownership,
        concentration: deployed + amount > 0 ? positionTotal / (deployed + amount) : 0,
        remaining: available - amount,
        downside: project("downside"),
        base,
        upside: project("upside"),
        followOnCapacity: Math.max(0, available - amount) * 0.4,
      };
    });
  }, [company, amounts, deployed, available]);

  const profiles = useMemo(() => {
    if (!company) return [];
    const defs = [
      {
        name: "Conservative allocation",
        share: 0.03,
        reserve: 1.0,
        note: "Sized so a total loss costs 3% of total capital. Leaves the largest follow-on reserve.",
      },
      {
        name: "Standard allocation",
        share: 0.06,
        reserve: 0.6,
        note: "In line with the average position size in the portfolio today.",
      },
      {
        name: "High-conviction allocation",
        share: 0.12,
        reserve: 0.4,
        note: "Concentrates capital in this single position and reduces what is left for the rest of the pipeline.",
      },
    ];
    return defs.map((d) => {
      const amount = Math.round((totalCapital * d.share) / 50_000) * 50_000;
      const ownership = impliedOwnership(amount, company.valuation ?? 0);
      const base = projectScenario("base", company.scenarios.base, company.latestRevenue, ownership, amount, company.latestYear);
      const down = projectScenario("downside", company.scenarios.downside, company.latestRevenue, ownership, amount, company.latestYear);
      const up = projectScenario("upside", company.scenarios.upside, company.latestRevenue, ownership, amount, company.latestYear);
      return {
        ...d,
        amount,
        ownership,
        base,
        down,
        up,
        reserveAmount: amount * d.reserve,
        remaining: available - amount - amount * d.reserve,
      };
    });
  }, [company, totalCapital, available]);

  if (!company) return <div className="text-[12px] text-ink-3">No companies registered.</div>;

  return (
    <>
      <div className="flex items-end gap-3 mb-4">
        <label>
          <span className="label block mb-1.5">Company</span>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              router.replace(`/sizing?company=${e.target.value}`);
            }}
            className="w-[280px]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label block mb-1.5">Custom amount (NOK)</span>
          <input type="number" step="50000" value={custom} onChange={(e) => setCustom(Number(e.target.value))} className="num w-[160px]" />
        </label>
        <div className="ml-auto text-[11.5px] text-ink-3">
          Valuation used: {nok(company.valuation)} pre-money · available capital {nok(available)}
        </div>
      </div>

      <Card className="mb-4" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle
            title="What each investment size does"
            hint="Ownership, concentration and scenario outcomes across sizes. This is a sensitivity table — it does not recommend a size."
            right={<DataTag kind="ASSUMPTION" />}
          />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Investment</th>
                <th className="text-right">Ownership</th>
                <th className="text-right">Portfolio concentration</th>
                <th className="text-right">Remaining capital</th>
                <th className="text-right">Downside value</th>
                <th className="text-right">Downside profit</th>
                <th className="text-right">Base profit</th>
                <th className="text-right">Upside profit</th>
                <th className="text-right">Base MOIC</th>
                <th className="text-right">Base IRR</th>
                <th className="text-right">Follow-on capacity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.amount} className={r.amount === custom ? "bg-[color:var(--surface-2)]" : ""}>
                  <td className="num text-[12.5px]">{nok(r.amount)}</td>
                  <td className="text-right num">{pct(r.ownership, 2)}</td>
                  <td className="text-right num">{pct(r.concentration, 1)}</td>
                  <td className={`text-right num ${r.remaining < 0 ? "text-[color:var(--neg)]" : ""}`}>{nok(r.remaining)}</td>
                  <td className="text-right num text-ink-2">{nok(r.downside.valueOfPosition)}</td>
                  <td className="text-right num text-[color:var(--neg)]">{signedNok(r.downside.profit)}</td>
                  <td className="text-right num text-[color:var(--pos)]">{signedNok(r.base.profit)}</td>
                  <td className="text-right num text-[color:var(--pos)]">{signedNok(r.upside.profit)}</td>
                  <td className="text-right num">{multiple(r.base.moic)}</td>
                  <td className="text-right num text-ink-2">{pct(r.base.irr)}</td>
                  <td className="text-right num text-ink-3">{compact(r.followOnCapacity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
          Portfolio concentration = this position (including what we already hold) as a share of all deployed capital after the
          investment. Follow-on capacity assumes 40% of what is left can be reserved for follow-ons.
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {profiles.map((p) => (
          <Card key={p.name} className="border-dashed">
            <SectionTitle title={p.name} hint={`${pct(p.share, 0)} of total capital`} />
            <div className="num text-[22px] mb-1">{nok(p.amount)}</div>
            <div className="text-[11.5px] text-ink-2 leading-relaxed mb-4">{p.note}</div>
            <div className="space-y-1.5">
              {[
                ["Ownership", pct(p.ownership, 2)],
                ["Follow-on reserve", nok(p.reserveAmount)],
                ["Capital left after reserve", nok(p.remaining)],
                ["Downside value", nok(p.down.valueOfPosition)],
                ["Base value", nok(p.base.valueOfPosition)],
                ["Upside value", nok(p.up.valueOfPosition)],
                ["Base profit", signedNok(p.base.profit)],
                ["Base MOIC", multiple(p.base.moic)],
                ["Base IRR", pct(p.base.irr)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-[11.5px]">
                  <span className="text-ink-2">{label}</span>
                  <span className="num">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 max-w-3xl">
        <ScenarioNote>
          These are three alternative ways to size the same position, not a ranking. The system does not recommend one — it shows
          what each choice does to ownership, concentration and remaining capital so the decision is made with the consequences
          visible.
        </ScenarioNote>
      </div>
    </>
  );
}
