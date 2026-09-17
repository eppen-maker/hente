"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ThesisEditor({ companyId, initial }: { companyId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<"save" | "structure" | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function patch(body: Record<string, unknown>, mode: "save" | "structure") {
    setBusy(mode);
    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={14}
        placeholder="Why do we like this company? Write it in your own words — what has to be true, what we are underwriting, and what would make us wrong."
        className="w-full leading-relaxed text-[13px]"
      />
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => patch({ thesisText: text }, "save")}
          disabled={busy !== null}
          className="h-8 px-4 text-[12px] rounded-[3px] bg-[color:var(--accent)] text-[color:var(--bg)] disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save our thesis"}
        </button>
        <button
          onClick={() => patch({ thesisText: text, structureThesis: true }, "structure")}
          disabled={busy !== null}
          className="h-8 px-3 text-[12px] rounded-[3px] border border-[color:var(--line-strong)] text-ink-2 hover:text-ink disabled:opacity-50"
        >
          {busy === "structure" ? "Structuring…" : "Structure into sections"}
        </button>
        {saved ? <span className="text-[11.5px] text-[color:var(--pos)]">Saved</span> : null}
        <span className="text-[11px] text-ink-3 ml-auto">Our text is never overwritten by the structuring step.</span>
      </div>
    </div>
  );
}
