import { notFound } from "next/navigation";
import { Card, DataTag, SectionTitle } from "@/components/ui";
import { THESIS_LABELS } from "@/lib/analysis";
import { readStore } from "@/lib/db";
import { date } from "@/lib/format";
import { ThesisEditor } from "./ThesisEditor";
import type { StructuredThesis } from "@/lib/analysis";

export default async function ThesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();
  const structured = company.thesis.structured as StructuredThesis | undefined;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <SectionTitle
          title="Our investment thesis"
          hint={`Written by us. Last updated ${date(company.thesis.updatedAt)}.`}
          right={<DataTag kind="RAW" />}
        />
        <ThesisEditor companyId={company.id} initial={company.thesis.ourText} />

        {company.thesis.ourText ? (
          <div className="mt-6 pt-5 border-t border-[color:var(--line)]">
            <div className="label mb-2">Current saved text</div>
            <p className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">{company.thesis.ourText}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          title="Structured thesis"
          hint="Our own sentences sorted into the standard sections, supplemented with registered facts where a section is empty. Nothing is rewritten."
          right={<DataTag kind="AI" />}
        />
        {structured ? (
          <>
            <div className="text-[10.5px] text-ink-3 mb-4">Structured {date(structured.generatedAt)}</div>
            <div className="space-y-4">
              {THESIS_LABELS.map(({ key, label }) => {
                const value = structured[key as keyof StructuredThesis] as string;
                const registered = value?.startsWith("Registered:") || value?.startsWith("Calculated:");
                return (
                  <div key={key} className="pb-4 border-b border-[color:var(--line)] last:border-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="label">{label}</div>
                      {registered ? <DataTag kind="RAW" /> : null}
                    </div>
                    <p className={`text-[12.5px] leading-relaxed ${value ? "text-ink-2" : "text-ink-3"}`}>
                      {value || "Not covered in our thesis text."}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-[12.5px] text-ink-3 leading-relaxed mt-2">
            Not structured yet. Write the thesis on the left and press &ldquo;Structure into sections&rdquo; — our sentences will be
            sorted into Why now, Market opportunity, Competitive advantage, Growth drivers, Scalability, Management, Catalysts and
            Key risks, without changing a word.
          </div>
        )}
      </Card>
    </div>
  );
}
