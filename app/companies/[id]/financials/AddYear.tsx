"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELDS = [
  ["revenue", "Revenue"],
  ["ebitda", "EBITDA"],
  ["operatingProfit", "Operating profit"],
  ["netIncome", "Net income"],
  ["equity", "Equity"],
  ["totalAssets", "Total assets"],
  ["debt", "Debt"],
  ["cash", "Cash"],
  ["employees", "Employees"],
] as const;

export function AddYear({ companyId, defaultYear }: { companyId: string; defaultYear: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    const entries = Object.fromEntries(form.entries()) as Record<string, string>;
    const financialYear: Record<string, unknown> = { year: Number(entries.year) };
    for (const [key] of FIELDS) financialYear[key] = entries[key] === "" ? null : Number(entries[key]);
    financialYear.source = entries.source || "Manual entry";
    financialYear.period = `FY${entries.year}`;
    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ financialYear }),
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-[11.5px] underline text-ink-2 hover:text-ink">
        Add or update a reported year →
      </button>
    );

  return (
    <form action={submit} className="card p-4 mt-3">
      <div className="label mb-3">Add or update a reported year — leave a field blank to keep it unavailable</div>
      <div className="grid grid-cols-5 gap-3">
        <div>
          <label className="label block mb-1.5">Year</label>
          <input name="year" type="number" defaultValue={defaultYear} required className="w-full" />
        </div>
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="label block mb-1.5">{label}</label>
            <input name={key} type="number" step="any" className="w-full" />
          </div>
        ))}
        <div className="col-span-3">
          <label className="label block mb-1.5">Source</label>
          <input name="source" placeholder="Brønnøysundregistrene – annual accounts" className="w-full" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 text-[12px] border rounded-[3px] text-ink-2">
          Cancel
        </button>
        <button disabled={busy} className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50">
          {busy ? "Saving…" : "Save year"}
        </button>
      </div>
    </form>
  );
}
