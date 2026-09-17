"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SECTORS = ["Technology", "Industrials", "Energy", "Healthcare", "Consumer", "Financials", "Real estate", "Materials"];

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to create company");
      return;
    }
    const { id } = await res.json();
    setOpen(false);
    router.push(`/companies/${id}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-[3px] text-[12px] bg-[color:var(--accent)] text-[color:var(--bg)] hover:opacity-90"
      >
        Register company
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20" onClick={() => setOpen(false)}>
          <div className="card w-[620px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[16px] font-semibold mb-1">Register company</h2>
            <p className="text-[11.5px] text-ink-3 mb-5">
              Only register what you actually know. Anything left blank is shown as DATA UNAVAILABLE rather than estimated.
            </p>
            <form
              action={submit}
              className="grid grid-cols-2 gap-3"
            >
              <Field label="Company name" name="name" required span2 />
              <Field label="Org.nr" name="orgNr" />
              <Field label="Ticker" name="ticker" placeholder="OSE: ABC" />
              <div>
                <label className="label block mb-1.5">Sector</label>
                <select name="sector" className="w-full" defaultValue="Technology">
                  {SECTORS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Field label="Industry" name="industry" placeholder="e.g. Vertical SaaS" />
              <Field label="Location" name="location" placeholder="Oslo, Norway" />
              <Field label="Website" name="website" />
              <div>
                <label className="label block mb-1.5">Listing</label>
                <select name="listing" className="w-full" defaultValue="UNLISTED">
                  <option value="UNLISTED">Unlisted</option>
                  <option value="LISTED">Listed</option>
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">Status</label>
                <select name="status" className="w-full" defaultValue="WATCHLIST">
                  <option value="WATCHLIST">Watchlist</option>
                  <option value="DUE_DILIGENCE">Due diligence</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="PORTFOLIO">Portfolio</option>
                  <option value="PASSED">Passed</option>
                </select>
              </div>
              <Field label="Latest known valuation (NOK)" name="latestValuation" type="number" />
              <Field label="Valuation source" name="valuationSource" placeholder="e.g. term sheet, Aug 2026" />
              <div className="col-span-2">
                <label className="label block mb-1.5">Description</label>
                <textarea name="description" rows={3} className="w-full" />
              </div>

              <div className="col-span-2 border-t border-[color:var(--line)] pt-3 mt-1">
                <div className="label mb-2">Latest reported year (optional)</div>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Year" name="fyYear" type="number" placeholder="2025" />
                  <Field label="Revenue" name="fyRevenue" type="number" />
                  <Field label="EBITDA" name="fyEbitda" type="number" />
                  <Field label="Net income" name="fyNetIncome" type="number" />
                  <Field label="Equity" name="fyEquity" type="number" />
                  <Field label="Total assets" name="fyTotalAssets" type="number" />
                  <Field label="Debt" name="fyDebt" type="number" />
                  <Field label="Cash" name="fyCash" type="number" />
                  <Field label="Employees" name="fyEmployees" type="number" />
                  <div className="col-span-3">
                    <label className="label block mb-1.5">Source</label>
                    <input name="fySource" placeholder="Brønnøysundregistrene – annual accounts" className="w-full" />
                  </div>
                </div>
              </div>

              {error ? <div className="col-span-2 text-[12px] text-[color:var(--neg)]">{error}</div> : null}

              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 text-[12px] border rounded-[3px] text-ink-2">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  span2,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="label block mb-1.5">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required} className="w-full" />
    </div>
  );
}
