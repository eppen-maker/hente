import Link from "next/link";
import { PortfolioTrend } from "@/components/charts";
import { Bar, Card, Kpi, Logo, PageHeader, Pill, ScenarioNote, SectionTitle, StatusBadge } from "@/components/ui";
import { readStore } from "@/lib/db";
import { compact, date, multiple, nok, pct, signedNok, toneOf } from "@/lib/format";
import {
  allocationBy,
  portfolioTotals,
  portfolioValueOverTime,
  positionsOf,
  recentDevelopments,
} from "@/lib/portfolio";

export default function DashboardPage() {
  const store = readStore();
  const t = portfolioTotals(store);
  const positions = positionsOf(store);
  const trend = portfolioValueOverTime(store);
  const byCompany = allocationBy(store, "company");
  const bySector = allocationBy(store, "sector");
  const byListing = allocationBy(store, "listing");
  const developments = recentDevelopments(store, 7);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio overview"
        title={store.meta.fundName}
        subtitle={`${t.numberOfCompanies} companies · ${t.numberOfInvestments} investments · ${store.investors.length} investors · all figures in NOK`}
      />

      <div className="label mb-2.5">Current position — reported and calculated</div>
      <div className="grid grid-cols-6 gap-3 mb-7">
        <Kpi label="Total capital" value={nok(t.totalCapital)} sub={`${nok(t.committedCapital)} committed`} tag="RAW" />
        <Kpi label="Invested capital" value={nok(t.invested)} sub={`${pct(t.invested / t.totalCapital)} of total capital`} tag="CALCULATED" />
        <Kpi
          label="Current estimated value"
          value={nok(t.currentValue)}
          sub="Latest known valuation × our ownership"
          tag="CALCULATED"
        />
        <Kpi
          label="Unrealized gain / loss"
          value={signedNok(t.unrealised)}
          tone={toneOf(t.unrealised)}
          sub={`${multiple(t.moic)} MOIC on cost`}
          tag="CALCULATED"
        />
        <Kpi
          label="Available capital / dry powder"
          value={nok(t.available)}
          sub={`${nok(t.reserved)} reserved for follow-ons`}
          tag="CALCULATED"
        />
        <Kpi label="Number of investments" value={String(t.numberOfInvestments)} sub={`${t.numberOfCompanies} companies`} tag="RAW" />
      </div>

      <div className="label mb-2.5">Scenario values — sensitivity analysis on our assumptions</div>
      <div className="grid grid-cols-6 gap-3 mb-3">
        <Kpi
          label="Potential base value"
          value={nok(t.baseValue)}
          sub={`${multiple(t.baseMoic)} MOIC · ${pct(t.baseIrr)} IRR`}
          tag="ASSUMPTION"
          scenario
        />
        <Kpi label="Potential base profit" value={signedNok(t.baseProfit)} tone={toneOf(t.baseProfit)} tag="ASSUMPTION" scenario />
        <Kpi label="Potential upside value" value={nok(t.upsideValue)} sub={`${multiple(t.upsideMoic)} MOIC`} tag="ASSUMPTION" scenario />
        <Kpi label="Potential upside profit" value={signedNok(t.upsideProfit)} tone={toneOf(t.upsideProfit)} tag="ASSUMPTION" scenario />
        <Kpi label="Downside value" value={nok(t.downsideValue)} sub="If downside assumptions hold" tag="ASSUMPTION" scenario />
        <Kpi label="Downside profit / loss" value={signedNok(t.downsideProfit)} tone={toneOf(t.downsideProfit)} tag="ASSUMPTION" scenario />
      </div>
      <div className="mb-8">
        <ScenarioNote />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="col-span-2">
          <SectionTitle
            title="Portfolio value over time"
            hint="Capital deployed is exact. Estimated value marks each position at the valuation known that year, otherwise at cost."
          />
          <PortfolioTrend data={trend} />
        </Card>

        <Card>
          <SectionTitle title="Capital deployed" hint="Against total capital available to the platform" />
          <div className="mt-4 space-y-4">
            {[
              { label: "Invested", value: t.invested, color: "var(--chart-1)" },
              { label: "Reserved for follow-ons", value: t.reserved, color: "var(--chart-2)" },
              { label: "Available / dry powder", value: t.available, color: "var(--chart-3)" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[12px] text-ink-2">{row.label}</span>
                  <span className="num text-[12px]">{nok(row.value)}</span>
                </div>
                <Bar share={row.value / t.totalCapital} color={row.color} />
                <div className="text-[10.5px] text-ink-3 mt-1">{pct(row.value / t.totalCapital)} of total capital</div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[color:var(--line)] text-[11px] text-ink-3">
            Potential profit at base case: <span className="num text-ink">{signedNok(t.baseProfit)}</span> over a weighted{" "}
            {positions.length ? Math.round(positions.reduce((s, p) => s + p.scenarios.base.years * p.invested, 0) / t.invested) : 0}-year
            horizon (assumption).
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { title: "Allocation by company", hint: "Share of invested capital", data: byCompany },
          { title: "Allocation by sector", hint: "Share of invested capital", data: bySector },
          { title: "Listed vs unlisted", hint: "Share of invested capital", data: byListing },
        ].map((block, blockIndex) => (
          <Card key={block.title}>
            <SectionTitle title={block.title} hint={block.hint} />
            <div className="space-y-3 mt-4">
              {block.data.map((s, i) => (
                <div key={s.key}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[12px] text-ink-2 truncate">{s.key}</span>
                    <span className="num text-[11.5px] text-ink-3 shrink-0">
                      {compact(s.value)} · {pct(s.share, 0)}
                    </span>
                  </div>
                  <Bar share={s.share} color={`var(--chart-${((blockIndex * 3 + i) % 8) + 1})`} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2" padded={false}>
          <div className="p-5 pb-3">
            <SectionTitle title="Largest positions" hint="Ranked by invested capital" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Ownership</th>
                <th className="text-right">Current value</th>
                <th className="text-right">Unrealized</th>
                <th className="text-right">Base value</th>
                <th className="text-right">Base MOIC</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.company.id}>
                  <td>
                    <Link href={`/companies/${p.company.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Logo text={p.company.logoText} color={p.company.logoColor} size={26} />
                      <span className="text-[12.5px]">{p.company.name}</span>
                    </Link>
                  </td>
                  <td className="text-right num">{nok(p.invested)}</td>
                  <td className="text-right num">{pct(p.ownership, 2)}</td>
                  <td className="text-right num">{nok(p.currentValue)}</td>
                  <td
                    className={`text-right num ${
                      toneOf(p.unrealised) === "pos"
                        ? "text-[color:var(--pos)]"
                        : toneOf(p.unrealised) === "neg"
                          ? "text-[color:var(--neg)]"
                          : ""
                    }`}
                  >
                    {signedNok(p.unrealised)}
                  </td>
                  <td className="text-right num text-ink-2">{nok(p.scenarios.base.valueOfPosition)}</td>
                  <td className="text-right num text-ink-2">{multiple(p.scenarios.base.moic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 text-[10.5px] text-ink-3 border-t border-[color:var(--line)]">
            Base value and base MOIC are scenario outputs from our own assumptions, not current value.
          </div>
        </Card>

        <Card>
          <SectionTitle title="Recent company developments" hint="Registered events, newest first" />
          <div className="mt-4 space-y-4">
            {developments.map((d, i) => (
              <div key={i} className="pb-4 border-b border-[color:var(--line)] last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="num text-[10.5px] text-ink-3">{date(d.date)}</span>
                  <Pill muted>{d.kind.replace("_", " ").toLowerCase()}</Pill>
                </div>
                <Link href={`/companies/${d.companyId}`} className="text-[12.5px] leading-snug hover:underline">
                  {d.title}
                </Link>
                <div className="text-[11px] text-ink-3 mt-1">
                  {d.companyName} · source: {d.source}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="col-span-3">
          <SectionTitle title="Pipeline" hint="Companies we follow that we have not invested in" />
          <div className="flex flex-wrap gap-2 mt-3">
            {store.companies
              .filter((c) => !positions.some((p) => p.company.id === c.id))
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center gap-2.5 border border-[color:var(--line)] rounded-[3px] px-3 py-2 hover:border-[color:var(--ink-3)]"
                >
                  <Logo text={c.logoText} color={c.logoColor} size={24} />
                  <span className="text-[12.5px]">{c.name}</span>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
