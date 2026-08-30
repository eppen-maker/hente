import { AdminPage, EmptyState, InternalTag, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { PRICING_SOURCE_LABELS } from "@/lib/admin/status";
import {
  listAdminProducts,
  listCampaignPricing,
  listCampaigns,
  listOrganizationPricing,
  listOrganizations,
  listVolumePricing,
  resolveAdminPricing,
} from "@/lib/repositories/admin";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Priser" };

export default async function PricingPage() {
  const [products, campaigns, organizations, campaignPricing, organizationPricing, tiers] =
    await Promise.all([
      listAdminProducts(),
      listCampaigns(),
      listOrganizations(),
      listCampaignPricing(),
      listOrganizationPricing(),
      listVolumePricing(),
    ]);

  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? "—";
  const organizationName = (id: string) =>
    organizations.find((o) => o.id === id)?.name ?? "—";
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  // Effective price per active campaign, with the winning source named.
  const effective = await Promise.all(
    campaigns.map(async (campaign) => {
      const product = products[0];
      if (!product) return null;
      const { breakdown, source } = await resolveAdminPricing({
        product,
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
      });
      return {
        campaign,
        organization: organizationName(campaign.organizationId),
        product,
        breakdown,
        source,
      };
    }),
  );

  return (
    <AdminPage
      title="Priser"
      lead="Rekkefølgen er fast: dugnadspris, så organisasjonspris, så volumtrinn, så standardpris."
    >
      <Panel
        title="Prisrekkefølge"
        description="Første treff vinner. Et volumtrinn kan bare senke en avtalt pris, aldri heve den."
      >
        <ol className="flex flex-wrap items-center gap-3 text-sm">
          {(["campaign", "organization", "volume", "product-default"] as const).map(
            (source, index) => (
              <li key={source} className="flex items-center gap-3">
                {index > 0 ? <span className="text-ink-faint">›</span> : null}
                <span className="rounded-full border border-line-strong px-3 py-1.5 text-ink">
                  {PRICING_SOURCE_LABELS[source]}
                </span>
              </li>
            ),
          )}
        </ol>
      </Panel>

      <Panel title="Gjeldende pris per dugnad" padding={false}>
        <Table minWidth="60rem">
          <thead>
            <tr>
              <Th>Organisasjon</Th>
              <Th>Dugnad</Th>
              <Th>Produkt</Th>
              <Th align="right">Utsalg</Th>
              <Th align="right">Innkjøp</Th>
              <Th align="right">Til klubben</Th>
              <Th align="right">Andel</Th>
              <Th>Kilde</Th>
            </tr>
          </thead>
          <tbody>
            {effective.filter(Boolean).map((row) => {
              if (!row) return null;
              return (
                <tr key={row.campaign.id}>
                  <Td>{row.organization}</Td>
                  <Td>{row.campaign.name}</Td>
                  <Td>{row.product.name}</Td>
                  <Td align="right">{formatCurrency(row.breakdown.consumerPrice)}</Td>
                  <Td align="right">{formatCurrency(row.breakdown.organizationPrice)}</Td>
                  <Td align="right">{formatCurrency(row.breakdown.organizationMargin)}</Td>
                  <Td align="right">{formatPercent(row.breakdown.marginRate)}</Td>
                  <Td>
                    <StatusBadge
                      label={PRICING_SOURCE_LABELS[row.source]}
                      tone={row.source === "product-default" ? "muted" : "progress"}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Dugnadspriser" padding={false}>
          {campaignPricing.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Ingen dugnadspriser" />
            </div>
          ) : (
            <Table minWidth="34rem">
              <thead>
                <tr>
                  <Th>Dugnad</Th>
                  <Th>Produkt</Th>
                  <Th align="right">Innkjøp</Th>
                  <Th align="right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {campaignPricing.map((row) => (
                  <tr key={row.id}>
                    <Td>{campaignName(row.campaignId)}</Td>
                    <Td>{productName(row.productId)}</Td>
                    <Td align="right">{formatCurrency(row.partnerPrice)}</Td>
                    <Td align="right">{formatCurrency(row.organizationMargin)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Organisasjonspriser" padding={false}>
          {organizationPricing.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Ingen organisasjonspriser"
                body="Uten en egen avtale gjelder dugnadsprisen eller standardprisen."
              />
            </div>
          ) : (
            <Table minWidth="34rem">
              <thead>
                <tr>
                  <Th>Organisasjon</Th>
                  <Th>Produkt</Th>
                  <Th align="right">Innkjøp</Th>
                  <Th align="right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {organizationPricing.map((row) => (
                  <tr key={row.id}>
                    <Td>{organizationName(row.organizationId)}</Td>
                    <Td>{productName(row.productId)}</Td>
                    <Td align="right">{formatCurrency(row.partnerPrice)}</Td>
                    <Td align="right">{formatCurrency(row.organizationMargin)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel
        title="Volumtrinn"
        description="Ingen trinn er konfigurert, så kundene ser ingen rabatt. Legges trinn inn, gjelder de fra angitt antall."
        padding={false}
      >
        {tiers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Ingen volumtrinn"
              body="Standardprisen gjelder for alle volum."
            />
          </div>
        ) : (
          <Table minWidth="44rem">
            <thead>
              <tr>
                <Th>Produkt</Th>
                <Th>Gjelder</Th>
                <Th align="right">Fra antall</Th>
                <Th align="right">Til antall</Th>
                <Th align="right">Innkjøpspris</Th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id}>
                  <Td>{productName(tier.productId)}</Td>
                  <Td>{tier.campaignId ? campaignName(tier.campaignId) : "Alle dugnader"}</Td>
                  <Td align="right">{formatNumber(tier.minQuantity)}</Td>
                  <Td align="right">
                    {tier.maxQuantity == null ? "og opp" : formatNumber(tier.maxQuantity)}
                  </Td>
                  <Td align="right">{formatCurrency(tier.organizationPrice)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Standardpriser" actions={<InternalTag />} padding={false}>
        <Table minWidth="44rem">
          <thead>
            <tr>
              <Th>Produkt</Th>
              <Th align="right">Utsalg</Th>
              <Th align="right">Innkjøp klubb</Th>
              <Th align="right">Klubbens margin</Th>
              <Th align="right">Vår kost eks. mva.</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <Td>{product.name}</Td>
                <Td align="right">{formatCurrency(product.consumerPrice)}</Td>
                <Td align="right">{formatCurrency(product.defaultPartnerPrice)}</Td>
                <Td align="right">
                  {formatCurrency(product.consumerPrice - product.defaultPartnerPrice)}
                </Td>
                <Td align="right">
                  {product.landedCostExVat == null
                    ? "Ikke satt"
                    : formatCurrency(product.landedCostExVat)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </AdminPage>
  );
}
