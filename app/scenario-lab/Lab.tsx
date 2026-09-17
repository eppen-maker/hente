"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ScenarioChart } from "@/components/charts";
import { Bar, Card, DataTag, Kpi, ScenarioNote, SectionTitle } from "@/components/ui";
import { impliedOwnership, projectScenario, simpleIrr } from "@/lib/finance";
import { multiple, nok, pct, signedNok, toneOf } from "@/lib/format";
import type { ScenarioSet } from "@/lib/types";

export interface LabCompany {
  id: string;
  name: string;
  sector: string;
  valuation: number | null;
  latestRevenue: number | null;
  latestYear: number;
  scenarios: ScenarioSet;
}

export interface LabInvestor {
  id: string;
  name: string;
  available: number;
  vehicleOwnership: number;
}

export function Lab({
  companies,
  investors,
  initialCapital,
  initialPositions,
  vehicleName,
}: {
  companies: LabCompany[];
  investors: LabInvestor[];
  initialCapital: number;
  initialPositions: { companyId: string; amount: number }[];
  vehicleName: string;
}) {
  const [capital, setCapital] = useState(initialCapital);
  const [positions, setPositions] = useState(initialPositions);
  const [basis, setBasis] = useState<"PRORATA" | "VEHICLE">("PRORATA");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const result = useMemo(() => {
    const lines = positions
      .map((p) => {
        const c = companies.find((x) => x.id === p.companyId);
        if (!c || p.amount <= 0) return null;
        const ownership = impliedOwnership(p.amount, c.valuation ?? 0);
        const project = (k: "downside" | "base" | "upside") =>
          projectScenario(k, c.scenarios[k], c.latestRevenue, ownership, p.amount, c.latestYear);
        const base = project("base");
        return {
          company: c,
          amount: p.amount,
          ownership,
          downside: project("downside").valueOfPosition,
          base: base.valueOfPosition,
          upside: project("upside").valueOfPosition,
          years: base.years,
          moic: base.moic,
        };
      })
      .filter(Boolean) as {
      company: LabCompany;
      amount: number;
      ownership: number;
      downside: number | null;
      base: number | null;
      upside: number | null;
      years: number;
      moic: number | null;
    }[];

    const invested = lines.reduce((s, l) => s + l.amount, 0);
    const sum = (f: (l: (typeof lines)[number]) => number | null) => lines.reduce((s, l) => s + (f(l) ?? 0), 0);
    const downsideValue = sum((l) => l.downside);
    const baseValue = sum((l) => l.base);
    const upsideValue = sum((l) => l.upside);
    const years = invested > 0 ? lines.reduce((s, l) => s + l.years * l.amount, 0) / invested : 0;
    return {
      lines,
      invested,
      remaining: capital - invested,
      downsideValue,
      baseValue,
      upsideValue,
      downsideProfit: downsideValue - invested,
      baseProfit: baseValue - invested,
      upsideProfit: upsideValue - invested,
      moic: invested > 0 ? baseValue / invested : null,
      moicDownside: invested > 0 ? downsideValue / invested : null,
      moicUpside: invested > 0 ? upsideValue / invested : null,
      irr: invested > 0 && years > 0 ? simpleIrr(invested, baseValue, years) : null,
      years,
    };
  }, [positions, companies, capital]);

  const shares = useMemo(() => {
    const totalAvailable = investors.reduce((s, i) => s + i.available, 0);
    return investors.map((i) => ({
      investor: i,
      share: basis === "VEHICLE" ? i.vehicleOwnership : totalAvailable > 0 ? i.available / totalAvailable : 0,
    }));
  }, [investors, basis]);

  const setAmount = (companyId: string, amount: number) =>
    setPositions((prev) => {
      const next = prev.some((p) => p.companyId === companyId)
        ? prev.map((p) => (p.companyId === companyId ? { ...p, amount } : p))
        : [...prev, { companyId, amount }];
      setSaved(false);
      return next;
    });

  const addPosition = (companyId: string) => {
    if (!companyId || positions.some((p) => p.companyId === companyId)) return;
    setPositions([...positions, { companyId, amount: 500_000 }]);
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    await fetch("/api/lab", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ totalCapital: capital, positions }),
    });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const unused = companies.filter((c) => !positions.some((p) => p.companyId === c.id));

  return (
    <>
      <div className="grid grid-cols-8 gap-3 mb-3">
        <Kpi label="Total available capital" value={nok(capital)} tag="RAW" />
        <Kpi label="Total invested in this scenario" value={nok(result.invested)} sub={`${result.lines.length} positions`} tag="ASSUMPTION" scenario />
        <Kpi
          label="Remaining capital"
          value={nok(result.remaining)}
          tone={result.remaining < 0 ? "neg" : "flat"}
          tag="ASSUMPTION"
          scenario
        />
        <Kpi label="Downside portfolio value" value={nok(result.downsideValue)} sub={multiple(result.moicDownside)} tag="ASSUMPTION" scenario />
        <Kpi label="Base portfolio value" value={nok(result.baseValue)} sub={multiple(result.moic)} tag="ASSUMPTION" scenario />
        <Kpi label="Upside portfolio value" value={nok(result.upsideValue)} sub={multiple(result.moicUpside)} tag="ASSUMPTION" scenario />
        <Kpi label="Base potential profit" value={signedNok(result.baseProfit)} tone={toneOf(result.baseProfit)} tag="ASSUMPTION" scenario />
        <Kpi
          label="Portfolio IRR (base)"
          value={pct(result.irr)}
          sub={`${result.years.toFixed(1)} year weighted horizon`}
          tag="ASSUMPTION"
          scenario
        />
      </div>
      <div className="mb-6">
        <ScenarioNote />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2" padded={false}>
          <div className="p-5 pb-2 flex items-end justify-between gap-4">
            <SectionTitle title="Positions in this scenario" hint="Set an amount per company and the portfolio recalculates" />
            <div className="flex items-end gap-2">
              <label>
                <span className="label block mb-1.5">Total capital</span>
                <input
                  type="number"
                  step="500000"
                  value={capital}
                  onChange={(e) => {
                    setCapital(Number(e.target.value));
                    setSaved(false);
                  }}
                  className="num w-[150px]"
                />
              </label>
              <select
                onChange={(e) => {
                  addPosition(e.target.value);
                  e.target.value = "";
                }}
                defaultValue=""
                className="w-[180px]"
              >
                <option value="">Add company…</option>
                {unused.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="text-right">Investment</th>
                  <th className="text-right">Ownership</th>
                  <th className="text-right">Downside</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Upside</th>
                  <th className="text-right">Base MOIC</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const line = result.lines.find((l) => l.company.id === p.companyId);
                  const company = companies.find((c) => c.id === p.companyId);
                  if (!company) return null;
                  return (
                    <tr key={p.companyId}>
                      <td className="text-[12.5px]">
                        {company.name}
                        <div className="text-[10.5px] text-ink-3">
                          {company.sector} · valuation {nok(company.valuation)}
                        </div>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="100000"
                          value={p.amount}
                          onChange={(e) => setAmount(p.companyId, Number(e.target.value))}
                          className="num text-right w-[140px]"
                        />
                      </td>
                      <td className="text-right num">{pct(line?.ownership ?? 0, 2)}</td>
                      <td className="text-right num text-ink-2">{nok(line?.downside ?? null)}</td>
                      <td className="text-right num text-ink-2">{nok(line?.base ?? null)}</td>
                      <td className="text-right num text-ink-2">{nok(line?.upside ?? null)}</td>
                      <td className="text-right num">{multiple(line?.moic ?? null)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            setPositions(positions.filter((x) => x.companyId !== p.companyId));
                            setSaved(false);
                          }}
                          className="text-[11px] text-ink-3 hover:text-[color:var(--neg)]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[color:var(--line-strong)]">
                  <td className="text-[11px] text-ink-3">Total</td>
                  <td className="text-right num">{nok(result.invested)}</td>
                  <td />
                  <td className="text-right num">{nok(result.downsideValue)}</td>
                  <td className="text-right num">{nok(result.baseValue)}</td>
                  <td className="text-right num">{nok(result.upsideValue)}</td>
                  <td className="text-right num">{multiple(result.moic)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-5 pt-3 border-t border-[color:var(--line)] flex items-center gap-3">
            <button
              onClick={save}
              disabled={busy}
              className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save scenario"}
            </button>
            {saved ? <span className="text-[11.5px] text-[color:var(--pos)]">Saved</span> : null}
            <span className="text-[11px] text-ink-3 ml-auto">
              Saving keeps this scenario for later. It does not register any investment.
            </span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle title="Portfolio outcomes" hint="Total value across all positions in this scenario" />
            <ScenarioChart
              invested={result.invested}
              data={[
                { name: "Downside", value: result.downsideValue },
                { name: "Base", value: result.baseValue },
                { name: "Upside", value: result.upsideValue },
              ]}
              height={190}
            />
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-ink-2">Downside profit / loss</span>
                <span className={`num ${result.downsideProfit < 0 ? "text-[color:var(--neg)]" : ""}`}>{signedNok(result.downsideProfit)}</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-ink-2">Base potential profit</span>
                <span className="num text-[color:var(--pos)]">{signedNok(result.baseProfit)}</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-ink-2">Upside potential profit</span>
                <span className="num text-[color:var(--pos)]">{signedNok(result.upsideProfit)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Capital use" hint="Against the total capital in this scenario" />
            <div className="space-y-3 mt-3">
              <div>
                <div className="flex justify-between text-[11.5px] mb-1.5">
                  <span className="text-ink-2">Deployed</span>
                  <span className="num">{pct(capital > 0 ? result.invested / capital : 0, 0)}</span>
                </div>
                <Bar share={capital > 0 ? result.invested / capital : 0} />
              </div>
              {result.lines.map((l, i) => (
                <div key={l.company.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-ink-3 truncate">{l.company.name}</span>
                    <span className="num text-ink-3">{pct(result.invested > 0 ? l.amount / result.invested : 0, 0)}</span>
                  </div>
                  <Bar share={result.invested > 0 ? l.amount / result.invested : 0} color={`var(--chart-${(i % 8) + 1})`} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-2 flex items-end justify-between">
          <SectionTitle
            title="The same scenario per investor"
            hint={
              basis === "VEHICLE"
                ? `Split by each investor's ownership of ${vehicleName}`
                : "Split pro-rata by each investor's available capital"
            }
            right={<DataTag kind="ASSUMPTION" />}
          />
          <select value={basis} onChange={(e) => setBasis(e.target.value as "PRORATA" | "VEHICLE")} className="w-[280px]">
            <option value="PRORATA">Split pro-rata by available capital</option>
            <option value="VEHICLE">Split by ownership of {vehicleName}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th className="text-right">Share</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Remaining capital</th>
                <th className="text-right">Downside value</th>
                <th className="text-right">Base value</th>
                <th className="text-right">Upside value</th>
                <th className="text-right">Base profit</th>
                <th className="text-right">MOIC</th>
                <th className="text-right">IRR</th>
              </tr>
            </thead>
            <tbody>
              {shares.map(({ investor, share }) => {
                const invested = result.invested * share;
                const base = result.baseValue * share;
                return (
                  <tr key={investor.id}>
                    <td className="text-[12.5px]">{investor.name}</td>
                    <td className="text-right num">{pct(share, 1)}</td>
                    <td className="text-right num">{nok(invested)}</td>
                    <td className={`text-right num ${investor.available - invested < 0 ? "text-[color:var(--neg)]" : ""}`}>
                      {nok(investor.available - invested)}
                    </td>
                    <td className="text-right num text-ink-2">{nok(result.downsideValue * share)}</td>
                    <td className="text-right num text-ink-2">{nok(base)}</td>
                    <td className="text-right num text-ink-2">{nok(result.upsideValue * share)}</td>
                    <td className={`text-right num ${base - invested >= 0 ? "text-[color:var(--pos)]" : "text-[color:var(--neg)]"}`}>
                      {signedNok(base - invested)}
                    </td>
                    <td className="text-right num">{multiple(invested > 0 ? base / invested : null)}</td>
                    <td className="text-right num text-ink-2">{pct(result.irr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
