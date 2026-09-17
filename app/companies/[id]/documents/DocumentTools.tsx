"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  ["ANNUAL_REPORT", "Annual report"],
  ["QUARTERLY_REPORT", "Quarterly report"],
  ["INVESTOR_PRESENTATION", "Investor presentation"],
  ["PITCH_DECK", "Pitch deck"],
  ["BUDGET", "Budget"],
  ["FINANCIAL_MODEL", "Financial model"],
  ["SHAREHOLDER_AGREEMENT", "Shareholder agreement"],
  ["BOARD_PRESENTATION", "Board presentation"],
] as const;

export function UploadDocument({ companyId }: { companyId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string)?.trim() || file?.name || "";
    await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId,
        name,
        type: form.get("type"),
        period: form.get("period"),
        pages: form.get("pages") ? Number(form.get("pages")) : null,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <form action={submit} className="grid grid-cols-5 gap-3 items-end">
      <div className="col-span-2">
        <label className="label block mb-1.5">File</label>
        <input type="file" name="file" className="w-full text-[11.5px]" />
      </div>
      <div>
        <label className="label block mb-1.5">Document name</label>
        <input name="name" placeholder="Annual Report 2025.pdf" className="w-full" />
      </div>
      <div>
        <label className="label block mb-1.5">Type</label>
        <select name="type" className="w-full" defaultValue="ANNUAL_REPORT">
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label block mb-1.5">Period</label>
          <input name="period" placeholder="FY2025" className="w-full" />
        </div>
        <button
          disabled={busy}
          className="h-[30px] px-3 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
        >
          {busy ? "…" : "Register"}
        </button>
      </div>
    </form>
  );
}

export function AskDocuments({ companyId }: { companyId: string }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ answer: string; citations: { document: string; page: number; text: string }[] } | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    const res = await fetch("/api/documents/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId, question }),
    });
    setResult(await res.json());
    setBusy(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="What revenue target did management communicate for 2028?"
          className="flex-1"
        />
        <button
          onClick={ask}
          disabled={busy}
          className="h-[30px] px-3 text-[12px] rounded-[3px] border border-[color:var(--line-strong)] text-ink-2 hover:text-ink disabled:opacity-50"
        >
          {busy ? "Searching…" : "Ask"}
        </button>
      </div>

      {result ? (
        <div className="mt-4">
          <p className="text-[12.5px] leading-relaxed text-ink-2">{result.answer}</p>
          {result.citations.map((c, i) => (
            <div key={i} className="mt-3 border-l-2 border-[color:var(--line-strong)] pl-3">
              <div className="text-[12px] text-ink leading-relaxed">&ldquo;{c.text}&rdquo;</div>
              <div className="text-[10.5px] text-ink-3 mt-1">
                {c.document} · page {c.page}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
