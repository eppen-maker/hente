"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateMemoButton({ companyId }: { companyId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function generate() {
    setBusy(true);
    await fetch("/api/memos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setBusy(false);
    router.push(`/companies/${companyId}/memo`);
    router.refresh();
  }

  return (
    <button
      onClick={generate}
      disabled={busy}
      className="h-8 px-3 rounded-[3px] text-[12px] bg-[color:var(--accent)] text-[color:var(--bg)] hover:opacity-90 disabled:opacity-50"
    >
      {busy ? "Generating…" : "Generate investment memo"}
    </button>
  );
}
