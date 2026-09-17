import Link from "next/link";
import { Card, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date, pct } from "@/lib/format";
import { recentDevelopments } from "@/lib/portfolio";

const KIND_LABEL: Record<string, string> = {
  ANNUAL_REPORT: "New annual accounts",
  QUARTERLY_REPORT: "New quarterly report",
  REVENUE: "Revenue change",
  MARGIN: "Margin deterioration",
  DEBT: "Debt increase",
  CAPITAL_RAISE: "Capital raise",
  OWNERSHIP: "Ownership change",
  MANAGEMENT: "Management change",
  ANNOUNCEMENT: "Company announcement",
  SHARE_PRICE: "Share price move",
};

export default function UpdatesPage() {
  const store = readStore();
  const feed = recentDevelopments(store, 40);

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Updates & alerts"
        subtitle="Registered company events and the alert rules that will run once external data sources are connected."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2" padded={false}>
          <div className="p-5 pb-2">
            <SectionTitle title="Registered updates" hint="Everything logged across the companies we follow, newest first" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Type</th>
                <th>Event</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((d, i) => (
                <tr key={i}>
                  <td className="num text-[11.5px] text-ink-2">{date(d.date)}</td>
                  <td>
                    <Link href={`/companies/${d.companyId}`} className="text-[12.5px] hover:underline">
                      {d.companyName}
                    </Link>
                  </td>
                  <td>
                    <Pill muted>{KIND_LABEL[d.kind] ?? d.kind}</Pill>
                  </td>
                  <td className="text-[12.5px] whitespace-normal max-w-[420px]">
                    {d.title}
                    {d.detail ? <div className="text-[11px] text-ink-3 mt-0.5">{d.detail}</div> : null}
                  </td>
                  <td className="text-[11px] text-ink-3">{d.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionTitle title="Alert rules" hint="Infrastructure is in place; external triggers connect with the data sources" />
          <div className="mt-3 space-y-3">
            {store.alerts.map((a) => (
              <div key={a.id} className="pb-3 border-b border-[color:var(--line)] last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12.5px]">{KIND_LABEL[a.kind] ?? a.kind}</div>
                    <div className="text-[11px] text-ink-2 mt-0.5 leading-relaxed">{a.description}</div>
                    <div className="text-[10.5px] text-ink-3 mt-1">
                      {a.companyId ? `Scoped to ${store.companies.find((c) => c.id === a.companyId)?.name ?? a.companyId}` : "All companies"}
                      {a.threshold !== null ? ` · threshold ${pct(a.threshold, 0)}` : ""}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] tracking-[0.07em] uppercase px-1.5 py-[1px] border rounded-[2px] shrink-0 ${
                      a.enabled ? "text-[color:var(--accent)] border-[color:var(--accent)]" : "text-ink-3"
                    }`}
                  >
                    {a.enabled ? "Armed" : "Off"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-3 mt-4 leading-relaxed">
            Rules are evaluated against registered data. Automatic triggers — new filings, price moves, ownership changes — start
            firing when the corresponding source is connected on the Data sources page.
          </p>
        </Card>
      </div>
    </>
  );
}
