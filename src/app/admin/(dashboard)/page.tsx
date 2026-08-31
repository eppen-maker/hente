import Link from "next/link";

import {
  LargestCampaignsChart,
  OrdersOverTimeChart,
  VolumePerMonthChart,
} from "@/components/admin/DashboardCharts";
import {
  AdminPage,
  EmptyState,
  InternalTag,
  KpiCard,
  Panel,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { deliveryStatus } from "@/lib/admin/status";
import { dashboardMetrics } from "@/lib/admin/stats";
import { listOrganizations } from "@/lib/repositories/admin";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Oversikt" };

export default async function AdminDashboardPage() {
  const [metrics, organizations] = await Promise.all([
    dashboardMetrics(),
    listOrganizations(),
  ]);
  const orgName = (id: string) =>
    organizations.find((org) => org.id === id)?.name ?? "—";

  const { economics } = metrics;

  return (
    <AdminPage
      title="Oversikt"
      lead="Status på dugnader, bestillinger og leveranser akkurat nå."
    >
      {/* Headline KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Aktive dugnader"
          value={formatNumber(metrics.activeCampaigns)}
          sub={`${formatNumber(metrics.organizationCount)} organisasjoner`}
        />
        <KpiCard
          label="Produkter bestilt"
          value={formatNumber(metrics.unitsOrdered)}
          sub={`${formatNumber(metrics.orderCount)} bestillinger`}
        />
        <KpiCard
          label="Ordreverdi"
          value={formatCurrency(metrics.orderValue)}
          sub={`${formatCurrency(metrics.expectedRevenueExVat)} eks. mva.`}
        />
        <KpiCard
          label="Fortjeneste til klubber"
          value={formatCurrency(metrics.organizationProfit)}
          emphasis
        />
      </div>

      {/* Operational numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Venter bekreftelse"
          value={formatNumber(metrics.ordersAwaitingConfirmation)}
          sub={metrics.ordersAwaitingConfirmation > 0 ? "Krever handling" : "Ingenting å ta"}
        />
        <KpiCard
          label="Henvendelser"
          value={formatNumber(metrics.leadCountTotal)}
          sub={
            metrics.leadsLastWeek > 0
              ? `${formatNumber(metrics.leadsLastWeek)} siste sju dager`
              : "ingen nye denne uka"
          }
        />
        <KpiCard
          label="Snitt ordrestørrelse"
          value={formatNumber(metrics.averageOrderSize)}
          sub="produkter per bestilling"
        />
        <KpiCard
          label="Produkter per deltaker"
          value={
            metrics.averageUnitsPerParticipant == null
              ? "—"
              : formatNumber(metrics.averageUnitsPerParticipant, { decimals: 1 })
          }
          sub="snitt i dugnader med bestilling"
        />
        <KpiCard
          label="Andel med bestilling"
          value={metrics.conversionRate == null ? "—" : formatPercent(metrics.conversionRate)}
          sub={`${formatNumber(metrics.leadCount)} leads i basen`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Bestillinger over tid" description="Antall bestillinger per dag.">
          <OrdersOverTimeChart data={metrics.ordersOverTime} />
        </Panel>
        <Panel title="Volum per måned" description="Bestilte produkter per måned.">
          <VolumePerMonthChart data={metrics.volumePerMonth} />
        </Panel>
      </div>

      <Panel title="Største dugnader" description="Målt i bestilte produkter.">
        <LargestCampaignsChart data={metrics.largestCampaigns} />
      </Panel>

      {/* Internal economics — never shown outside the admin area */}
      <Panel
        title="Intern økonomi"
        description="SØRKYSTs egne tall. Vises aldri på kundesider."
        actions={<InternalTag />}
      >
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Enheter" value={formatNumber(economics.units)} />
          <KpiCard label="Omsetning eks. mva." value={formatCurrency(economics.revenueExVat)} />
          <KpiCard
            label="Varekost"
            value={economics.cogs == null ? "—" : formatCurrency(economics.cogs)}
          />
          <KpiCard
            label="Bruttofortjeneste"
            value={economics.grossProfit == null ? "—" : formatCurrency(economics.grossProfit)}
          />
          <KpiCard
            label="Bruttomargin"
            value={economics.grossMargin == null ? "—" : formatPercent(economics.grossMargin, 1)}
          />
          <KpiCard
            label="Til klubbene"
            value={formatCurrency(economics.organizationProfit)}
          />
        </div>
        {economics.incomplete ? (
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Ett eller flere produkter mangler innkjøpskost (
            <code className="text-ink">landed_cost_ex_vat</code>). Varekost og margin er
            derfor ufullstendige — sett kosten under{" "}
            <Link href="/admin/produkter" className="underline underline-offset-4">
              Produkter
            </Link>
            .
          </p>
        ) : null}
      </Panel>

      <Panel title="Kommende leveranser" padding={false}>
        {metrics.upcomingDeliveries.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Ingen leveranser planlagt" />
          </div>
        ) : (
          <Table minWidth="44rem">
            <thead>
              <tr>
                <Th>Organisasjon</Th>
                <Th align="right">Antall</Th>
                <Th>Ønsket dato</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {metrics.upcomingDeliveries.map((delivery) => {
                const status = deliveryStatus(delivery.status);
                return (
                  <tr key={delivery.id}>
                    <Td>{orgName(delivery.organizationId)}</Td>
                    <Td align="right">{formatNumber(delivery.quantity)}</Td>
                    <Td>{delivery.requestedDate ?? "Ikke satt"}</Td>
                    <Td>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
