"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ScenarioChart } from "@/components/charts";
import { DataTag } from "@/components/ui";
import { projectScenario } from "@/lib/finance";
import { multiple, nok, pct, signedNok } from "@/lib/format";
import type { ScenarioAssumptions, ScenarioKey, ScenarioSet } from "@/lib/types";

const KEYS: ScenarioKey[] = ["downside", "base", "upside"];

const INPUTS: { key: keyof ScenarioAssumptions; label: string; step: number; as: "pct" | "num" | "year" }[] = [
  { key: "revenueGrowth", label: "Revenue growth p.a.", step: 1, as: "pct" },
  { key: "ebitdaMargin", label: "EBITDA margin at exit", step: 1, as: "pct" },
  { key: "exitYear", label: "Exit year", step: 1, as: "year" },
  { key: "exitMultiple", label: "Exit multiple", step: 0.5, as: "num" },
  { key: "dilution", label: "Dilution until exit", step: 1, as: "pct" },
  { key: "futureCapitalNeed", label: "Future capital need (NOK)", step: 100000, as: "num" },
];

export function ScenarioEditor({
  companyId,
  initial,
  baseRevenue,
  baseYear,
  ownership,
  invested,
}: {
  companyId: string;
  initial: ScenarioSet;
  baseRevenue: number | null;
  baseYear: number;
  ownership: number;
  invested: number;
}) {
  const [scenarios, setScenarios] = useState<ScenarioSet>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const capital = invested > 0 ? invested : 1_000_000;

  const results = useMemo(
    () =>
      Object.fromEntries(
        KEYS.map((k) => [
          k,
          projectScenario(k, scenarios[k], baseRevenue, ownership > 0 ? ownership : 0, capital, baseYear),
        ]),
      ) as Record<ScenarioKey, ReturnType<typeof projectScenario>>,
    [scenarios, baseRevenue, ownership, capital, baseYear],
  );

  const update = (key: ScenarioKey, field: keyof ScenarioAssumptions, value: number | string) => {
    setScenarios({ ...scenarios, [key]: { ...scenarios[key], [field]: value } });
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarios }),
    });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {KEYS.map((k, i) => {
          const a = scenarios[k];
          const r = results[k];
          return (
            <div key={k} className="card p-5 border-dashed">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: `var(--seq-${i + 1})` }} />
                  <h3 className="text-[13px] font-semibold capitalize">{k}</h3>
                </div>
                <DataTag kind="ASSUMPTION" />
              </div>

              <div className="space-y-2.5">
                {INPUTS.map((input) => {
                  const raw = a[input.key] as number;
                  const shown = input.as === "pct" ? Math.round(raw * 1000) / 10 : raw;
                  return (
                    <label key={String(input.key)} className="flex items-center justify-between gap-3">
                      <span className="text-[11.5px] text-ink-2">{input.label}</span>
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          step={input.step}
                          value={shown}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            update(k, input.key, input.as === "pct" ? v / 100 : v);
                          }}
                          className="num text-right w-[104px]"
                        />
                        {input.as === "pct" ? <span className="text-[11px] text-ink-3 w-3">%</span> : <span className="w-3" />}
                      </span>
                    </label>
                  );
                })}
                <label className="flex items-center justify-between gap-3">
                  <span className="text-[11.5px] text-ink-2">Multiple applied to</span>
                  <select
                    value={a.exitBasis}
                    onChange={(e) => update(k, "exitBasis", e.target.value)}
                    className="w-[120px] text-[11.5px]"
                  >
                    <option value="EBITDA">EV/EBITDA</option>
                    <option value="REVENUE">EV/Revenue</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 pt-4 border-t border-[color:var(--line)] space-y-1.5">
                {[
                  ["Future revenue", nok(r.futureRevenue)],
                  ["Future EBITDA", nok(r.futureEbitda)],
                  ["Potential company value", nok(r.companyValue)],
                  ["Our ownership at exit", pct(r.ownershipAtExit, 2)],
                  ["Potential value of our investment", nok(r.valueOfPosition)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-[11.5px]">
                    <span className="text-ink-2">{label}</span>
                    <span className="num">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[12px] pt-2 mt-1 border-t border-[color:var(--line)]">
                  <span className="text-ink-2">Potential profit / loss</span>
                  <span className={`num ${(r.profit ?? 0) >= 0 ? "text-[color:var(--pos)]" : "text-[color:var(--neg)]"}`}>
                    {signedNok(r.profit)}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-2">MOIC</span>
                  <span className="num">{multiple(r.moic)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-2">IRR over {r.years} years</span>
                  <span className="num">{pct(r.irr)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[13px] font-semibold">Potential value of our investment</h3>
            <span className="text-[11px] text-ink-3">
              Based on {nok(capital)} invested{invested > 0 ? "" : " (illustrative — we hold no position)"} at {pct(ownership, 2)} ownership
            </span>
          </div>
          <ScenarioChart
            invested={capital}
            data={KEYS.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), value: results[k].valueOfPosition }))}
          />
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-semibold mb-3">Save assumptions</h3>
          <p className="text-[11.5px] text-ink-2 leading-relaxed">
            These inputs drive the scenario values shown on the dashboard, the companies table, investor portfolios and the
            portfolio scenario lab. They are our assumptions — the system stores them as such and never presents the output as
            current value or as a forecast.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={save}
              disabled={busy}
              className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save scenarios"}
            </button>
            {saved ? <span className="text-[11.5px] text-[color:var(--pos)]">Saved</span> : null}
          </div>
          <div className="mt-5 pt-4 border-t border-[color:var(--line)] text-[11px] text-ink-3 leading-relaxed">
            Projection: revenue grows at the assumed rate from the latest reported year ({baseYear}), the exit multiple is applied
            to the resulting {scenarios.base.exitBasis === "EBITDA" ? "EBITDA" : "revenue"}, and our ownership is reduced by the
            assumed dilution. IRR assumes a single exit at the exit year.
          </div>
        </div>
      </div>
    </>
  );
}
