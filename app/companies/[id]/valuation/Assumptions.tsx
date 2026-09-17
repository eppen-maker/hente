"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { compact, multiple, nok } from "@/lib/format";

interface Props {
  companyId: string;
  listing: "LISTED" | "UNLISTED";
  initial: {
    latestValuation: number | null;
    entryValuation: number | null;
    sharePrice: number | null;
    sharesOutstanding: number | null;
    netDebt: number | null;
    comparableEvEbitda: number | null;
    comparableEvRevenue: number | null;
    source: string;
  };
  latestRevenue: number | null;
  latestEbitda: number | null;
}

const n = (v: string): number | null => (v === "" ? null : Number(v));

export function ValuationAssumptions({ companyId, listing, initial, latestRevenue, latestEbitda }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const set = (key: keyof Props["initial"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: key === "source" ? e.target.value : n(e.target.value) });
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ valuation: form }),
    });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const compEbitda = form.comparableEvEbitda !== null && latestEbitda !== null ? form.comparableEvEbitda * latestEbitda : null;
  const compRevenue = form.comparableEvRevenue !== null && latestRevenue !== null ? form.comparableEvRevenue * latestRevenue : null;

  const Row = ({ label, k, step = "any" }: { label: string; k: keyof Props["initial"]; step?: string }) => (
    <label className="flex items-center justify-between gap-4 py-2 border-t border-[color:var(--line)] first:border-0">
      <span className="text-[12px] text-ink-2">{label}</span>
      <input
        type={k === "source" ? "text" : "number"}
        step={step}
        value={(form[k] ?? "") as string | number}
        onChange={set(k)}
        className={`num text-right ${k === "source" ? "w-[220px]" : "w-[150px]"}`}
      />
    </label>
  );

  return (
    <div>
      <div className="mt-1">
        {listing === "LISTED" ? (
          <>
            <Row label="Share price (NOK)" k="sharePrice" />
            <Row label="Shares outstanding" k="sharesOutstanding" />
          </>
        ) : (
          <>
            <Row label="Latest known valuation (NOK)" k="latestValuation" />
            <Row label="Entry valuation (NOK)" k="entryValuation" />
          </>
        )}
        <Row label="Net debt (NOK)" k="netDebt" />
        <Row label="Comparable EV/EBITDA" k="comparableEvEbitda" />
        <Row label="Comparable EV/Revenue" k="comparableEvRevenue" />
        <Row label="Source" k="source" />
      </div>

      <div className="mt-4 pt-4 border-t border-[color:var(--line)] space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="text-ink-2">Comparable valuation on EBITDA</span>
          <span className="num">{compEbitda !== null ? nok(compEbitda) : "DATA UNAVAILABLE"}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-ink-2">Comparable valuation on revenue</span>
          <span className="num">{compRevenue !== null ? nok(compRevenue) : "DATA UNAVAILABLE"}</span>
        </div>
        <div className="text-[10.5px] text-ink-3">
          Comparable multiples are our assumptions applied to the latest reported {latestEbitda !== null ? `EBITDA of ${compact(latestEbitda)}` : "figures"}
          {latestRevenue !== null ? ` and revenue of ${compact(latestRevenue)}` : ""}.
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={save}
          disabled={busy}
          className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save assumptions"}
        </button>
        {saved ? <span className="text-[11.5px] text-[color:var(--pos)]">Saved</span> : null}
        <span className="text-[11px] text-ink-3 ml-auto">
          Multiples shown elsewhere recalculate from these inputs ({multiple(form.comparableEvEbitda)} / {multiple(form.comparableEvRevenue)}).
        </span>
      </div>
    </div>
  );
}
