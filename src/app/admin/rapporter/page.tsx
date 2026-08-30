import { AdminPage, InternalTag, KpiCard, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import {
  LargestCampaignsChart,
  VolumePerMonthChart,
} from "@/components/admin/DashboardCharts";
import { campaignStatus } from "@/lib/admin/status";
import { campaignSummaries, dashboardMetrics, organizationSummaries } from "@/lib/admin/stats";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Rapporter" };

export default async function ReportsPage() {
  const [metrics, campaigns, organizations] = await Promise.all([
    dashboardMetrics(),
    campaignSummaries(),
    organizationSummaries(),
  ]);

  const { economics } = metrics;
  const withOrders = organizations.filter((summary) => summary.orderCount > 0);

  return (
    <AdminPage
      title="Rapporter"
      lead="Salg, volum og margin på tvers av dugnader og organisasjoner."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Omsetning eks. mva." value={formatCurrency(economics.revenueExVat)} />
        <KpiCard
          label="Bruttofortjeneste"
          value={economics.grossProfit == null ? "—" : formatCurrency(economics.grossProfit)}
          sub={economics.grossMargin == null ? "Kost mangler" : formatPercent(economics.grossMargin, 1)}
        />
        <KpiCard label="Enheter" value={formatNumber(economics.units)} />
        <KpiCard
          label="Til klubbene"
          value={formatCurrency(economics.organizationProfit)}
          emphasis
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Volum per måned">
          <VolumePerMonthChart data={metrics.volumePerMonth} />
        </Panel>
        <Panel title="Største dugnader">
          <LargestCampaignsChart data={metrics.largestCampaigns} />
        </Panel>
      </div>

      <Panel title="Dugnader" padding={false}>
        <Table minWidth="64rem">
          <thead>
            <tr>
              <Th>Organisasjon</Th>
              <Th>Dugnad</Th>
              <Th align="right">Deltakere</Th>
              <Th align="right">Bestilt</Th>
              <Th align="right">Per deltaker</Th>
              <Th align="right">Til klubben</Th>
              <Th align="right">Mål nådd</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((summary) => {
              const status = campaignStatus(summary.campaign.status);
              return (
                <tr key={summary.campaign.id}>
                  <Td>{summary.organization?.name ?? "—"}</Td>
                  <Td>{summary.campaign.name}</Td>
                  <Td align="right">{formatNumber(summary.campaign.participants)}</Td>
                  <Td align="right">{formatNumber(summary.orderedUnits)}</Td>
                  <Td align="right">
                    {summary.unitsPerParticipant == null
                      ? "—"
                      : formatNumber(summary.unitsPerParticipant, { decimals: 1 })}
                  </Td>
                  <Td align="right">{formatCurrency(summary.expectedProfit)}</Td>
                  <Td align="right">
                    {summary.targetProgress == null ? "—" : formatPercent(summary.targetProgress)}
                  </Td>
                  <Td>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      <Panel
        title="Organisasjoner med bestilling"
        actions={<InternalTag />}
        padding={false}
      >
        <Table minWidth="56rem">
          <thead>
            <tr>
              <Th>Organisasjon</Th>
              <Th align="right">Bestillinger</Th>
              <Th align="right">Produkter</Th>
              <Th align="right">Ordreverdi</Th>
              <Th align="right">Til klubben</Th>
              <Th align="right">Per medlem</Th>
            </tr>
          </thead>
          <tbody>
            {withOrders.map((summary) => (
              <tr key={summary.organization.id}>
                <Td>{summary.organization.name}</Td>
                <Td align="right">{formatNumber(summary.orderCount)}</Td>
                <Td align="right">{formatNumber(summary.totalUnits)}</Td>
                <Td align="right">{formatCurrency(summary.totalOrderValue)}</Td>
                <Td align="right">{formatCurrency(summary.totalOrganizationProfit)}</Td>
                <Td align="right">
                  {summary.averageUnitsPerParticipant == null
                    ? "—"
                    : formatNumber(summary.averageUnitsPerParticipant, { decimals: 1 })}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </AdminPage>
  );
}
