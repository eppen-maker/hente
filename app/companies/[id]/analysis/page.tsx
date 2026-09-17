import { notFound } from "next/navigation";
import { Card, DataTag, SectionTitle } from "@/components/ui";
import { analyseCompany } from "@/lib/analysis";
import { readStore } from "@/lib/db";
import { sourcesFor } from "@/lib/datasources";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const sections = analyseCompany(company, store.investments);
  const counts = sections
    .flatMap((s) => s.statements)
    .reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.kind]: (acc[s.kind] ?? 0) + 1 }), {});

  return (
    <>
      <div className="card p-4 mb-5 flex items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="text-[12.5px] text-ink-2 leading-relaxed">
            This analysis is generated from the data registered for {company.name}. Every statement is labelled: facts restate a
            reported figure or a deterministic calculation, interpretations are readings of those figures, and gaps say plainly
            where data is missing. No figure is produced that is not in the system.
          </div>
          <div className="text-[11px] text-ink-3 mt-2">Data sources in use: {sourcesFor(company).join(" · ")}</div>
        </div>
        <div className="flex gap-4 shrink-0 text-right">
          {[
            ["FACT", "Facts"],
            ["INTERPRETATION", "Interpretations"],
            ["GAP", "Gaps"],
          ].map(([k, label]) => (
            <div key={k}>
              <div className="num text-[18px]">{counts[k] ?? 0}</div>
              <div className="label mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="columns-2 gap-4 [&>*]:break-inside-avoid">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <Card>
              <SectionTitle title={section.title} />
              <ul className="space-y-2.5">
                {section.statements.map((s, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="mt-[3px] shrink-0">
                      <DataTag kind={s.kind === "INTERPRETATION" ? "AI" : s.kind === "GAP" ? "GAP" : s.kind === "ASSUMPTION" ? "ASSUMPTION" : "RAW"} />
                    </span>
                    <span className={`text-[12.5px] leading-relaxed ${s.kind === "GAP" ? "text-ink-3" : "text-ink-2"}`}>{s.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
