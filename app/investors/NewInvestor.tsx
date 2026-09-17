"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewInvestorButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    await fetch("/api/investors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-[3px] text-[12px] bg-[color:var(--accent)] text-[color:var(--bg)] hover:opacity-90"
      >
        Add investor
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
          <form action={submit} className="card w-[560px] p-6 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="col-span-2 text-[16px] font-semibold mb-1">Add investor</h2>
            <p className="col-span-2 text-[11.5px] text-ink-3 mb-2">
              Capital is registered per person. Vehicle ownership is only used for investments made through the investment
              company — direct investments are allocated per transaction.
            </p>
            {[
              ["name", "Name", "text", true],
              ["role", "Role", "text", false],
              ["email", "Email", "email", false],
              ["availableCapital", "Available capital (NOK)", "number", false],
              ["committedCapital", "Committed capital (NOK)", "number", false],
              ["vehicleOwnership", "Ownership of the investment company (%)", "number", false],
              ["vehicleEquityContribution", "Equity contribution to the vehicle (NOK)", "number", false],
              ["vehicleShareholderLoan", "Shareholder loan to the vehicle (NOK)", "number", false],
            ].map(([name, label, type, required]) => (
              <div key={name as string}>
                <label className="label block mb-1.5">{label as string}</label>
                <input name={name as string} type={type as string} required={required as boolean} step="any" className="w-full" />
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 text-[12px] border rounded-[3px] text-ink-2">
                Cancel
              </button>
              <button disabled={busy} className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50">
                {busy ? "Saving…" : "Add investor"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
