import { notFound } from "next/navigation";
import { Card, DataTag, Pill, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date, num } from "@/lib/format";
import { AskDocuments, UploadDocument } from "./DocumentTools";

const TYPE_LABEL: Record<string, string> = {
  ANNUAL_REPORT: "Annual report",
  QUARTERLY_REPORT: "Quarterly report",
  INVESTOR_PRESENTATION: "Investor presentation",
  PITCH_DECK: "Pitch deck",
  BUDGET: "Budget",
  FINANCIAL_MODEL: "Financial model",
  SHAREHOLDER_AGREEMENT: "Shareholder agreement",
  BOARD_PRESENTATION: "Board presentation",
};

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const indexed = company.documents.filter((d) => d.extracts.length > 0).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Documents" hint={`${company.documents.length} registered · ${indexed} with indexed text`} />
        </div>
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Period</th>
              <th className="text-right">Pages</th>
              <th>Registered</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {company.documents.length ? (
              company.documents.map((d) => (
                <tr key={d.id}>
                  <td className="text-[12.5px]">{d.name}</td>
                  <td>
                    <Pill muted>{TYPE_LABEL[d.type] ?? d.type}</Pill>
                  </td>
                  <td className="num text-[11.5px] text-ink-2">{d.period}</td>
                  <td className="text-right num">{d.pages !== null ? num(d.pages) : "—"}</td>
                  <td className="num text-[11.5px] text-ink-2">{date(d.uploadedAt)}</td>
                  <td className="text-[11px] text-ink-3">{d.extracts.length ? `${d.extracts.length} passages` : "Not indexed"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-[12px] text-ink-3">
                  No documents registered for this company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="p-5 border-t border-[color:var(--line)]">
          <div className="label mb-3">Register a document</div>
          <UploadDocument companyId={company.id} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <SectionTitle title="Ask the documents" hint="Answers are quoted from indexed passages with file and page" right={<DataTag kind="AI" />} />
          <AskDocuments companyId={company.id} />
        </Card>

        <Card>
          <SectionTitle title="How this works" />
          <p className="text-[12px] text-ink-2 leading-relaxed">
            Documents are registered with their type and period so the rest of the system can reference them as sources. Text
            extraction runs through the document pipeline in the data layer; until a document is indexed, questions about it
            return DATA UNAVAILABLE rather than a generated answer.
          </p>
          <p className="text-[12px] text-ink-2 leading-relaxed mt-3">
            When a passage does match, the answer always shows the file name and page it came from, so every statement can be
            checked against the source.
          </p>
        </Card>
      </div>
    </div>
  );
}
