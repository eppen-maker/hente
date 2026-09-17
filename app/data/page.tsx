import Link from "next/link";
import { Card, DataTag, Kpi, PageHeader, SectionTitle } from "@/components/ui";
import { dataSources, sourcesFor } from "@/lib/datasources";
import { readStore } from "@/lib/db";
import { date } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  CONNECTED: "text-[color:var(--accent)] border-[color:var(--accent)]",
  NOT_CONFIGURED: "text-[color:var(--warn)] border-[color:var(--warn)]",
  PLANNED: "text-ink-3 border-[color:var(--line-strong)]",
};

const CLASSES = [
  { tag: "RAW", title: "Raw data", example: "Revenue 2025 = NOK 61,200,000", detail: "Reported figures from accounts, filings or market data. Stored with source, reporting period and the date we last updated it." },
  { tag: "CALCULATED", title: "Calculated metrics", example: "Revenue CAGR 2021–2025 = 26%", detail: "Derived deterministically from raw data. Recomputed whenever the underlying figures change." },
  { tag: "ASSUMPTION", title: "User assumptions", example: "Expected revenue growth to 2030 = 22% p.a.", detail: "Our own inputs: growth, margins, exit multiples, dilution. Everything downstream of these is a scenario, never a value." },
  { tag: "AI", title: "Interpretation", example: "“Growth appears to be accelerating”", detail: "A reading of the raw and calculated data. Always labelled, never presented as a reported figure." },
] as const;

export default function DataPage() {
  const store = readStore();
  const totalYears = store.companies.reduce((s, c) => s + c.financials.length, 0);
  const missingYears = store.companies.filter((c) => c.financials.length < 5).length;
  const unavailableCells = store.companies.reduce(
    (s, c) =>
      s +
      c.financials.reduce(
        (t, f) =>
          t +
          [f.revenue, f.ebitda, f.operatingProfit, f.netIncome, f.equity, f.totalAssets, f.debt, f.cash, f.employees].filter(
            (v) => v === null,
          ).length,
        0,
      ),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Data sources & quality"
        subtitle="What the numbers are, where they come from and what is missing. External providers plug into the same abstraction layer the system already reads through."
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Kpi label="Companies registered" value={String(store.companies.length)} tag="RAW" />
        <Kpi label="Reported years registered" value={String(totalYears)} sub={`${(totalYears / Math.max(1, store.companies.length)).toFixed(1)} per company`} tag="CALCULATED" />
        <Kpi label="Companies with fewer than 5 years" value={String(missingYears)} tag="CALCULATED" />
        <Kpi label="Unavailable data points" value={String(unavailableCells)} sub="Shown as DATA UNAVAILABLE, never estimated" tag="CALCULATED" />
      </div>

      <Card className="mb-4">
        <SectionTitle title="The four data classes" hint="Every figure in the system belongs to exactly one of these, and they are never blurred" />
        <div className="grid grid-cols-4 gap-4 mt-4">
          {CLASSES.map((c) => (
            <div key={c.tag} className="border border-[color:var(--line)] rounded-[3px] p-4">
              <DataTag kind={c.tag} />
              <div className="text-[13px] font-medium mt-2.5">{c.title}</div>
              <div className="num text-[11.5px] text-ink-2 mt-2">{c.example}</div>
              <p className="text-[11.5px] text-ink-3 leading-relaxed mt-2.5">{c.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-ink-2 leading-relaxed mt-4 pt-4 border-t border-[color:var(--line)]">
          The analysis engine never fills a gap with an estimate. Where a figure has not been registered the system prints DATA
          UNAVAILABLE and lists the gap under Missing information, so it is visible what we do not know.
        </p>
      </Card>

      <Card className="mb-4" padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Data sources" hint="The abstraction layer is in place; connecting a provider is an implementation of the same interface" />
        </div>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Kind</th>
              <th>Coverage</th>
              <th>Endpoint</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((s) => (
              <tr key={s.id}>
                <td className="text-[12.5px]">{s.name}</td>
                <td className="text-[12px] text-ink-2">{s.kind}</td>
                <td className="text-[12px] text-ink-2 whitespace-normal max-w-[420px]">{s.coverage}</td>
                <td className="text-[11px] text-ink-3">{s.endpoint ?? "—"}</td>
                <td>
                  <span className={`text-[10px] tracking-[0.07em] uppercase px-1.5 py-[1px] border rounded-[2px] ${STATUS_STYLE[s.status]}`}>
                    {s.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
          Pages and components never call a provider directly — they read through the data layer, so a new source becomes
          available everywhere at once.
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Source coverage per company" hint="Which sources the registered figures currently come from" />
        </div>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th className="text-right">Reported years</th>
              <th>Latest period</th>
              <th>Last updated</th>
              <th>Sources in use</th>
            </tr>
          </thead>
          <tbody>
            {store.companies.map((c) => {
              const last = c.financials[c.financials.length - 1];
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/companies/${c.id}`} className="text-[12.5px] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className={`text-right num ${c.financials.length < 5 ? "text-[color:var(--warn)]" : ""}`}>{c.financials.length}</td>
                  <td className="num text-[11.5px] text-ink-2">{last?.period ?? "—"}</td>
                  <td className="num text-[11.5px] text-ink-2">{last ? date(last.updatedAt) : "—"}</td>
                  <td className="text-[11px] text-ink-3 whitespace-normal max-w-[460px]">{sourcesFor(c).join(" · ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
