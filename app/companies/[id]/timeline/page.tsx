import { notFound } from "next/navigation";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  FOUNDED: "Founded",
  IDENTIFIED: "First identified",
  MEETING: "Meeting",
  DUE_DILIGENCE: "Due diligence",
  DECISION: "Investment decision",
  INVESTMENT: "Investment completed",
  FUNDING_ROUND: "Funding round",
  REPORT: "Report",
  CONTRACT: "Contract",
  MANAGEMENT: "Management change",
  FOLLOW_ON: "Follow-on investment",
  EXIT: "Exit",
  OTHER: "Event",
};

const HIGHLIGHT = new Set(["INVESTMENT", "FOLLOW_ON", "DECISION", "EXIT"]);

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const events = [...company.timeline].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-2">
        <SectionTitle title="Investment timeline" hint="From first contact to today. Only registered events are shown." />
        <div className="mt-5 relative pl-6">
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[color:var(--line)]" />
          {events.map((e, i) => (
            <div key={i} className="relative pb-6 last:pb-0">
              <span
                className="absolute left-[-21px] top-[5px] w-[11px] h-[11px] rounded-full border-2"
                style={{
                  background: HIGHLIGHT.has(e.type) ? "var(--accent)" : "var(--surface)",
                  borderColor: HIGHLIGHT.has(e.type) ? "var(--accent)" : "var(--line-strong)",
                }}
              />
              <div className="flex items-center gap-2.5">
                <span className="num text-[11px] text-ink-3">{date(e.date)}</span>
                <Pill muted>{TYPE_LABEL[e.type] ?? e.type}</Pill>
              </div>
              <div className="text-[13px] mt-1.5">{e.title}</div>
              {e.detail ? <div className="text-[11.5px] text-ink-2 mt-1 leading-relaxed max-w-2xl">{e.detail}</div> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Registered updates" hint="Company news and filings we have logged" />
        <div className="mt-3 space-y-3.5">
          {company.updates.length ? (
            company.updates.map((u, i) => (
              <div key={i} className="pb-3.5 border-b border-[color:var(--line)] last:border-0 last:pb-0">
                <div className="num text-[10.5px] text-ink-3">{date(u.date)}</div>
                <div className="text-[12.5px] mt-1">{u.title}</div>
                {u.detail ? <div className="text-[11px] text-ink-2 mt-1">{u.detail}</div> : null}
                <div className="text-[10.5px] text-ink-3 mt-1">Source: {u.source}</div>
              </div>
            ))
          ) : (
            <div className="text-[12px] text-ink-3">No updates registered.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
