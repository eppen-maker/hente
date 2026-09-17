"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ScenarioChart } from "@/components/charts";
import { Card, DataTag, Kpi, ScenarioNote, SectionTitle } from "@/components/ui";
import { impliedOwnership, projectScenario } from "@/lib/finance";
import { multiple, nok, pct, signedNok } from "@/lib/format";
import type { ScenarioKey, ScenarioSet } from "@/lib/types";

export interface AllocCompany {
  id: string;
  name: string;
  valuation: number | null;
  latestRevenue: number | null;
  latestYear: number;
  scenarios: ScenarioSet;
  existingInvested: number;
  existingOwnership: number;
}

export interface AllocInvestor {
  id: string;
  name: string;
  available: number;
  invested: number;
  vehicleOwnership: number;
}

const KEYS: ScenarioKey[] = ["downside", "base", "upside"];

export function Allocator({
  companies,
  investors,
  vehicleName,
  vehicleCapital,
}: {
  companies: AllocCompany[];
  investors: AllocInvestor[];
  vehicleName: string;
  vehicleCapital: number;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const initialCompany = companies.find((c) => c.id === search.get("company")) ?? companies[0];

  const [companyId, setCompanyId] = useState(initialCompany?.id ?? "");
  const company = companies.find((c) => c.id === companyId) ?? initialCompany;
  const [valuation, setValuation] = useState<number>(company?.valuation ?? 0);
  const [amount, setAmount] = useState<number>(1_000_000);
  const [structure, setStructure] = useState<"DIRECT" | "VEHICLE">("VEHICLE");
  const [lines, setLines] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onCompanyChange = (id: string) => {
    setCompanyId(id);
    const c = companies.find((x) => x.id === id);
    setValuation(c?.valuation ?? 0);
    setMessage(null);
  };

  const allocated = Object.values(lines).reduce((s, v) => s + (v || 0), 0);
  const remainderToAllocate = amount - allocated;

  const effectiveLines = useMemo(() => {
    if (structure === "VEHICLE") {
      return investors
        .filter((i) => i.vehicleOwnership > 0)
        .map((i) => ({ investor: i, amount: amount * i.vehicleOwnership, share: i.vehicleOwnership }));
    }
    return investors.map((i) => ({
      investor: i,
      amount: lines[i.id] ?? 0,
      share: amount > 0 ? (lines[i.id] ?? 0) / amount : 0,
    }));
  }, [structure, investors, lines, amount]);

  const ownership = impliedOwnership(amount, valuation);

  const results = useMemo(() => {
    if (!company) return null;
    return Object.fromEntries(
      KEYS.map((k) => [
        k,
        projectScenario(k, company.scenarios[k], company.latestRevenue, ownership, amount, company.latestYear),
      ]),
    ) as Record<ScenarioKey, ReturnType<typeof projectScenario>>;
  }, [company, ownership, amount]);

  async function register() {
    if (!company) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/investments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: company.id,
        amount,
        preMoneyValuation: valuation,
        structure,
        allocations: structure === "DIRECT" ? effectiveLines.map((l) => ({ investorId: l.investor.id, amount: l.amount })) : [],
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not register the investment");
      return;
    }
    setMessage("Investment registered. A snapshot of the case has been frozen.");
    router.refresh();
  }

  if (!company) return <div className="text-[12px] text-ink-3">No companies registered.</div>;

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="col-span-1">
          <SectionTitle title="The investment" hint="Terms of the round we are considering" />
          <div className="space-y-3 mt-2">
            <label className="block">
              <span className="label block mb-1.5">Company</span>
              <select value={companyId} onChange={(e) => onCompanyChange(e.target.value)} className="w-full">
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label block mb-1.5">Company valuation (pre-money, NOK)</span>
              <input
                type="number"
                step="100000"
                value={valuation}
                onChange={(e) => setValuation(Number(e.target.value))}
                className="w-full num"
              />
            </label>
            <label className="block">
              <span className="label block mb-1.5">Total proposed investment (NOK)</span>
              <input
                type="number"
                step="100000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full num"
              />
            </label>
            <label className="block">
              <span className="label block mb-1.5">Structure</span>
              <select value={structure} onChange={(e) => setStructure(e.target.value as "DIRECT" | "VEHICLE")} className="w-full">
                <option value="VEHICLE">Through {vehicleName} (structure B)</option>
                <option value="DIRECT">Directly by the investors (structure A)</option>
              </select>
            </label>
            <div className="pt-3 border-t border-[color:var(--line)] space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-2">Ownership acquired</span>
                <span className="num">{pct(ownership, 2)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-2">Post-money valuation</span>
                <span className="num">{nok(valuation + amount)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-2">Existing position</span>
                <span className="num">{company.existingInvested > 0 ? `${nok(company.existingInvested)} · ${pct(company.existingOwnership, 2)}` : "None"}</span>
              </div>
              {structure === "VEHICLE" ? (
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-2">Vehicle capital available</span>
                  <span className={`num ${amount > vehicleCapital ? "text-[color:var(--neg)]" : ""}`}>{nok(vehicleCapital)}</span>
                </div>
              ) : null}
            </div>
            <button
              onClick={register}
              disabled={busy || amount <= 0 || valuation <= 0 || (structure === "DIRECT" && Math.abs(remainderToAllocate) > 1)}
              className="w-full h-9 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-40"
            >
              {busy ? "Registering…" : "Register this investment"}
            </button>
            {structure === "DIRECT" && Math.abs(remainderToAllocate) > 1 ? (
              <div className="text-[11px] text-[color:var(--warn)]">
                {remainderToAllocate > 0 ? `${nok(remainderToAllocate)} left to allocate` : `${nok(-remainderToAllocate)} over-allocated`}
              </div>
            ) : null}
            {message ? <div className="text-[11.5px] text-[color:var(--pos)]">{message}</div> : null}
          </div>
        </Card>

        <Card className="col-span-3" padded={false}>
          <div className="p-5 pb-2">
            <SectionTitle
              title="Allocation between investors"
              hint={
                structure === "VEHICLE"
                  ? `Structure B: ${vehicleName} makes the investment. Each investor's attributable value follows from their ownership of the vehicle.`
                  : "Structure A: each investor holds the shares directly. Enter the amount per investor."
              }
              right={<DataTag kind="ASSUMPTION" />}
            />
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Investor</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">% of investment</th>
                  <th className="text-right">Attributable ownership</th>
                  <th className="text-right">Downside</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Upside</th>
                  <th className="text-right">Base profit</th>
                  <th className="text-right">MOIC</th>
                  <th className="text-right">IRR</th>
                </tr>
              </thead>
              <tbody>
                {effectiveLines.map((l) => {
                  const scale = (v: number | null) => (v === null ? null : v * l.share);
                  const base = scale(results?.base.valueOfPosition ?? null);
                  return (
                    <tr key={l.investor.id}>
                      <td className="text-[12.5px]">
                        {l.investor.name}
                        <div className="text-[10.5px] text-ink-3">
                          {nok(l.investor.available - l.investor.invested)} remaining before this
                        </div>
                      </td>
                      <td className="text-right">
                        {structure === "DIRECT" ? (
                          <input
                            type="number"
                            step="50000"
                            value={lines[l.investor.id] ?? 0}
                            onChange={(e) => setLines({ ...lines, [l.investor.id]: Number(e.target.value) })}
                            className="num text-right w-[130px]"
                          />
                        ) : (
                          <span className="num">{nok(l.amount)}</span>
                        )}
                      </td>
                      <td className="text-right num">{pct(l.share, 1)}</td>
                      <td className="text-right num">{pct(ownership * l.share, 3)}</td>
                      <td className="text-right num text-ink-2">{nok(scale(results?.downside.valueOfPosition ?? null))}</td>
                      <td className="text-right num text-ink-2">{nok(base)}</td>
                      <td className="text-right num text-ink-2">{nok(scale(results?.upside.valueOfPosition ?? null))}</td>
                      <td
                        className={`text-right num ${base !== null && base - l.amount >= 0 ? "text-[color:var(--pos)]" : "text-[color:var(--neg)]"}`}
                      >
                        {base !== null ? signedNok(base - l.amount) : "—"}
                      </td>
                      <td className="text-right num">{multiple(results?.base.moic ?? null)}</td>
                      <td className="text-right num text-ink-2">{pct(results?.base.irr ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[color:var(--line-strong)]">
                  <td className="text-[11px] text-ink-3">Total</td>
                  <td className="text-right num">{nok(structure === "DIRECT" ? allocated : amount)}</td>
                  <td className="text-right num">{pct(structure === "DIRECT" ? (amount > 0 ? allocated / amount : 0) : 1, 0)}</td>
                  <td className="text-right num">{pct(ownership, 2)}</td>
                  <td className="text-right num text-ink-2">{nok(results?.downside.valueOfPosition ?? null)}</td>
                  <td className="text-right num text-ink-2">{nok(results?.base.valueOfPosition ?? null)}</td>
                  <td className="text-right num text-ink-2">{nok(results?.upside.valueOfPosition ?? null)}</td>
                  <td className="text-right num">{signedNok(results?.base.profit ?? null)}</td>
                  <td className="text-right num">{multiple(results?.base.moic ?? null)}</td>
                  <td className="text-right num text-ink-2">{pct(results?.base.irr ?? null)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
            {structure === "VEHICLE"
              ? `Attributable ownership = ${vehicleName}'s ownership of the company × the investor's ownership of ${vehicleName}.`
              : "Attributable ownership = the ownership this round buys × the investor's share of the round."}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-2">
          <SectionTitle title="Scenario outcomes for the whole investment" hint={`${nok(amount)} into ${company.name} at ${nok(valuation)} pre-money`} />
          <ScenarioChart
            invested={amount}
            data={KEYS.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), value: results?.[k].valueOfPosition ?? null }))}
          />
        </Card>
        <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
          {KEYS.map((k) => {
            const r = results?.[k];
            return (
              <Kpi
                key={k}
                label={`${k} value`}
                value={nok(r?.valueOfPosition ?? null)}
                sub={`${signedNok(r?.profit ?? null)} · ${multiple(r?.moic ?? null)} · IRR ${pct(r?.irr ?? null)}`}
                tag="ASSUMPTION"
                scenario
              />
            );
          })}
          <Kpi
            label="Exit year assumed"
            value={String(company.scenarios.base.exitYear)}
            sub={`${results?.base.years ?? 0} years from the latest reported year`}
            tag="ASSUMPTION"
            scenario
          />
          <div className="col-span-2">
            <ScenarioNote />
          </div>
        </div>
      </div>
    </>
  );
}
