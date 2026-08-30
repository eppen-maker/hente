import {
  AdminPage,
  EmptyState,
  Panel,
  RowLink,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { CAMPAIGN_STATUSES, campaignStatus } from "@/lib/admin/status";
import { campaignSummaries } from "@/lib/admin/stats";
import { listAdminProducts, listOrganizations } from "@/lib/repositories/admin";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { changeCampaignStatusAction, createCampaignAction } from "../actions";

export const metadata = { title: "Dugnader" };

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink";
const label = "text-eyebrow text-ink-muted";

export default async function CampaignsPage() {
  const [summaries, organizations, products] = await Promise.all([
    campaignSummaries(),
    listOrganizations(),
    listAdminProducts(),
  ]);
  const defaultProduct = products[0];

  return (
    <AdminPage
      title="Dugnader"
      lead={`${formatNumber(summaries.length)} dugnader. Hver får en egen lenke klubben kan dele.`}
    >
      <Panel padding={false}>
        {summaries.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Ingen dugnader ennå" body="Opprett den første under." />
          </div>
        ) : (
          <Table minWidth="76rem">
            <thead>
              <tr>
                <Th>Organisasjon</Th>
                <Th>Dugnad</Th>
                <Th align="right">Deltakere</Th>
                <Th align="right">Mål</Th>
                <Th align="right">Bestilt</Th>
                <Th align="right">Per person</Th>
                <Th align="right">Fortjeneste</Th>
                <Th>Frist</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const { campaign, organization } = summary;
                const status = campaignStatus(campaign.status);
                return (
                  <tr key={campaign.id}>
                    <Td>
                      {organization ? (
                        <RowLink href={`/admin/organisasjoner/${organization.id}`}>
                          {organization.name}
                        </RowLink>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <span className="text-ink">{campaign.name}</span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        /dugnad/{campaign.slug}
                      </span>
                    </Td>
                    <Td align="right">{formatNumber(campaign.participants)}</Td>
                    <Td align="right">
                      {campaign.targetProfit ? formatCurrency(campaign.targetProfit) : "—"}
                      {summary.targetProgress != null ? (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {formatPercent(summary.targetProgress)} nådd
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">{formatNumber(summary.orderedUnits)}</Td>
                    <Td align="right">
                      {summary.unitsPerParticipant == null
                        ? "—"
                        : formatNumber(summary.unitsPerParticipant, { decimals: 1 })}
                    </Td>
                    <Td align="right">{formatCurrency(summary.expectedProfit)}</Td>
                    <Td>{campaign.orderDeadline ?? "—"}</Td>
                    <Td>
                      <form action={changeCampaignStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <StatusBadge label={status.label} tone={status.tone} />
                        <select
                          name="status"
                          defaultValue={campaign.status}
                          aria-label={`Endre status for ${campaign.name}`}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-ink"
                        >
                          {CAMPAIGN_STATUSES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-line-strong px-2 py-1 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
                        >
                          Sett
                        </button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel
        title="Ny dugnad"
        description="Lenken lages automatisk fra organisasjonens navn."
      >
        {organizations.length === 0 || !defaultProduct ? (
          <EmptyState
            title="Mangler grunnlag"
            body="Legg inn minst én organisasjon og ett produkt før du oppretter en dugnad."
          />
        ) : (
          <form action={createCampaignAction} className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="organizationId">Organisasjon</label>
              <select id="organizationId" name="organizationId" className={field} required>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="name">Navn på dugnaden</label>
              <input id="name" name="name" placeholder="Vårdugnad 2026" className={field} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="participants">Deltakere</label>
              <input id="participants" name="participants" inputMode="numeric" defaultValue="600" className={field} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="targetProfit">Mål for fortjeneste</label>
              <input id="targetProfit" name="targetProfit" inputMode="numeric" placeholder="500000" className={field} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="startDate">Startdato</label>
              <input id="startDate" name="startDate" type="date" className={field} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="orderDeadline">Bestillingsfrist</label>
              <input id="orderDeadline" name="orderDeadline" type="date" className={field} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="deliveryDate">Leveringsdato</label>
              <input id="deliveryDate" name="deliveryDate" type="date" className={field} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="productId">Produkt</label>
              <select id="productId" name="productId" className={field} required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="planned" className={field}>
                {CAMPAIGN_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="consumerPrice">Utsalgspris</label>
              <input
                id="consumerPrice"
                name="consumerPrice"
                inputMode="decimal"
                defaultValue={defaultProduct.consumerPrice}
                className={field}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="partnerPrice">Klubbens innkjøpspris</label>
              <input
                id="partnerPrice"
                name="partnerPrice"
                inputMode="decimal"
                defaultValue={defaultProduct.defaultPartnerPrice}
                className={field}
                required
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" size="sm">Opprett dugnad</Button>
            </div>
          </form>
        )}
      </Panel>
    </AdminPage>
  );
}
