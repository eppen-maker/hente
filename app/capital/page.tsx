import Link from "next/link";
import { Bar, Card, DataTag, Kpi, PageHeader, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { compact, nok, pct } from "@/lib/format";
import { allocationBy, portfolioTotals, positionsOf } from "@/lib/portfolio";

const DIMENSIONS = [
  { key: "company", label: "By company" },
  { key: "investor", label: "By investor" },
  { key: "sector", label: "By sector" },
  { key: "industry", label: "By industry" },
  { key: "listing", label: "Listed vs unlisted" },
  { key: "stage", label: "By investment stage" },
] as const;

export default function CapitalPage() {
  const store = readStore();
  const t = portfolioTotals(store);
  const positions = positionsOf(store);
  const slices = DIMENSIONS.map((d) => ({ ...d, data: allocationBy(store, d.key) }));

  const observations: string[] = [];
  const byCompany = slices.find((s) => s.key === "company")!.data;
  const bySector = slices.find((s) => s.key === "sector")!.data;
  if (byCompany[0]) observations.push(`${byCompany[0].key} represents ${pct(byCompany[0].share, 0)} of deployed capital.`);
  if (bySector[0]) observations.push(`${bySector[0].key} represents ${pct(bySector[0].share, 0)} of the portfolio.`);
  const listed = slices.find((s) => s.key === "listing")!.data.find((x) => x.key === "Listed");
  if (listed) observations.push(`Listed holdings account for ${pct(listed.share, 0)} of deployed capital.`);
  observations.push(`${pct(t.invested / t.totalCapital, 0)} of total capital is deployed; ${nok(t.available)} remains available.`);
  if (t.reserved > 0) observations.push(`${nok(t.reserved)} is reserved for follow-ons in ${store.reserves.length} existing positions.`);

  return (
    <>
      <PageHeader
        eyebrow="Capital"
        title="Capital deployment"
        subtitle="Where the capital is, what is committed, what is reserved for follow-ons and what is left."
      />

      <div className="grid grid-cols-5 gap-3 mb-4">
        <Kpi label="Total capital" value={nok(t.totalCapital)} sub={`${store.investors.length} investors`} tag="RAW" />
        <Kpi label="Invested" value={nok(t.invested)} sub={`${pct(t.invested / t.totalCapital, 0)} of total`} tag="CALCULATED" />
        <Kpi label="Committed" value={nok(t.committedCapital)} sub="Capital investors have committed" tag="RAW" />
        <Kpi label="Reserved for follow-ons" value={nok(t.reserved)} sub={`${store.reserves.length} positions`} tag="ASSUMPTION" />
        <Kpi label="Available / dry powder" value={nok(t.available)} sub="Total less invested and reserved" tag="CALCULATED" />
      </div>

      <Card className="mb-4">
        <SectionTitle title="Concentration observations" hint="Facts about how the capital is distributed today" right={<DataTag kind="CALCULATED" />} />
        <ul className="mt-3 space-y-2">
          {observations.map((o, i) => (
            <li key={i} className="text-[12.5px] text-ink-2 leading-relaxed pl-3 border-l border-[color:var(--line-strong)]">
              {o}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ink-3 mt-4 leading-relaxed">
          These are observations about the current distribution of capital, not recommendations. What follows from them is our
          decision.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {slices.map((s, blockIndex) => (
          <Card key={s.key}>
            <SectionTitle title={s.label} hint="Share of deployed capital" />
            <div className="space-y-3 mt-4">
              {s.data.map((row, i) => (
                <div key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[12px] text-ink-2 truncate">{row.key}</span>
                    <span className="num text-[11px] text-ink-3 shrink-0">
                      {compact(row.value)} · {pct(row.share, 0)}
                    </span>
                  </div>
                  <Bar share={row.share} color={`var(--chart-${((blockIndex * 2 + i) % 8) + 1})`} />
                </div>
              ))}
              {!s.data.length ? <div className="text-[12px] text-ink-3">No deployed capital.</div> : null}
            </div>
          </Card>
        ))}
      </div>

      <Card padded={false}>
        <div className="p-5 pb-2">
          <SectionTitle title="Deployment by position" hint="Including capital reserved for follow-ons" />
        </div>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Sector</th>
              <th>Stage</th>
              <th>Structure</th>
              <th className="text-right">Invested</th>
              <th className="text-right">Share of deployed</th>
              <th className="text-right">Reserved</th>
              <th className="text-right">Current value</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const reserve = store.reserves.find((r) => r.companyId === p.company.id)?.amount ?? 0;
              return (
                <tr key={p.company.id}>
                  <td>
                    <Link href={`/companies/${p.company.id}`} className="text-[12.5px] hover:underline">
                      {p.company.name}
                    </Link>
                  </td>
                  <td className="text-[12px] text-ink-2">{p.company.sector}</td>
                  <td className="text-[12px] text-ink-2">{p.company.stage}</td>
                  <td className="text-[12px] text-ink-2">
                    {p.structures.map((s) => (s === "VEHICLE" ? store.vehicle.name : "Direct")).join(" + ")}
                  </td>
                  <td className="text-right num">{nok(p.invested)}</td>
                  <td className="text-right num">{pct(p.invested / t.invested, 1)}</td>
                  <td className="text-right num text-ink-2">{reserve > 0 ? nok(reserve) : "—"}</td>
                  <td className="text-right num">{nok(p.currentValue)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[color:var(--line-strong)]">
              <td colSpan={4} className="text-[11px] text-ink-3">
                Total
              </td>
              <td className="text-right num">{nok(t.invested)}</td>
              <td className="text-right num">100.0%</td>
              <td className="text-right num">{nok(t.reserved)}</td>
              <td className="text-right num">{nok(t.currentValue)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </>
  );
}
