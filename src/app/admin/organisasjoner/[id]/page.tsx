import { notFound } from "next/navigation";

import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import {
  AdminPage,
  EmptyState,
  InternalTag,
  KpiCard,
  Panel,
  RowLink,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import {
  ORGANIZATION_STATUSES,
  PRICING_SOURCE_LABELS,
  campaignStatus,
  orderStatus,
} from "@/lib/admin/status";
import { organizationDetail } from "@/lib/admin/stats";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { saveOrganizationAction } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const detail = await organizationDetail(id);
  return { title: detail?.organization.name ?? "Organisasjon" };
}

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink";
const label = "text-eyebrow text-ink-muted";

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await organizationDetail(id);
  if (!detail) notFound();

  const { organization, activeCampaign, economics } = detail;
  const campaignLink = activeCampaign ? `/dugnad/${activeCampaign.slug}` : null;

  return (
    <AdminPage
      title={organization.name}
      lead={[organization.city, organization.organizationNumber]
        .filter(Boolean)
        .join(" · ")}
      actions={
        campaignLink ? <CopyLinkButton path={campaignLink} /> : undefined
      }
    >
      {/* Commercial summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Bestillinger" value={formatNumber(detail.orderCount)} />
        <KpiCard label="Produkter totalt" value={formatNumber(detail.totalUnits)} />
        <KpiCard label="Ordreverdi" value={formatCurrency(detail.totalOrderValue)} />
        <KpiCard
          label="Fortjeneste til klubben"
          value={formatCurrency(detail.totalOrganizationProfit)}
          emphasis
        />
        <KpiCard
          label="Snitt per medlem"
          value={
            detail.averageUnitsPerParticipant == null
              ? "—"
              : formatNumber(detail.averageUnitsPerParticipant, { decimals: 1 })
          }
          sub="produkter"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Dugnader" padding={false}>
            {detail.campaigns.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Ingen dugnader ennå" />
              </div>
            ) : (
              <Table minWidth="40rem">
                <thead>
                  <tr>
                    <Th>Dugnad</Th>
                    <Th align="right">Deltakere</Th>
                    <Th align="right">Mål</Th>
                    <Th>Frist</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.campaigns.map((campaign) => {
                    const status = campaignStatus(campaign.status);
                    return (
                      <tr key={campaign.id}>
                        <Td>
                          <span className="text-ink">{campaign.name}</span>
                          <span className="mt-0.5 block text-xs text-ink-faint">
                            /dugnad/{campaign.slug}
                          </span>
                        </Td>
                        <Td align="right">{formatNumber(campaign.participants)}</Td>
                        <Td align="right">
                          {campaign.targetProfit ? formatCurrency(campaign.targetProfit) : "—"}
                        </Td>
                        <Td>{campaign.orderDeadline ?? "—"}</Td>
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

          <Panel title="Bestillinger" padding={false}>
            {detail.orders.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Ingen bestillinger ennå" />
              </div>
            ) : (
              <Table minWidth="44rem">
                <thead>
                  <tr>
                    <Th>Ordre</Th>
                    <Th>Dato</Th>
                    <Th align="right">Antall</Th>
                    <Th align="right">Verdi</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.orders.map((order) => {
                    const status = orderStatus(order.status);
                    const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <tr key={order.id}>
                        <Td>
                          <RowLink href={`/admin/bestillinger/${order.id}`}>
                            {order.orderNumber}
                          </RowLink>
                        </Td>
                        <Td>{String(order.createdAt ?? "").slice(0, 10)}</Td>
                        <Td align="right">{formatNumber(units)}</Td>
                        <Td align="right">{formatCurrency(order.total)}</Td>
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

          <Panel title="Prisavtale" description="Hvilken pris som gjelder, og hvor den kommer fra.">
            <Table minWidth="36rem">
              <thead>
                <tr>
                  <Th>Produkt</Th>
                  <Th align="right">Utsalg</Th>
                  <Th align="right">Innkjøp</Th>
                  <Th align="right">Til klubben</Th>
                  <Th>Kilde</Th>
                </tr>
              </thead>
              <tbody>
                {detail.pricing.map((row) => (
                  <tr key={row.product.id}>
                    <Td>{row.product.name}</Td>
                    <Td align="right">{formatCurrency(row.consumerPrice)}</Td>
                    <Td align="right">{formatCurrency(row.price)}</Td>
                    <Td align="right">{formatCurrency(row.margin)}</Td>
                    <Td>
                      <StatusBadge
                        label={PRICING_SOURCE_LABELS[row.source]}
                        tone={row.source === "product-default" ? "muted" : "progress"}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel title="Aktivitet" description="Endringer logges automatisk.">
            {detail.activity.length === 0 ? (
              <EmptyState title="Ingen aktivitet registrert" />
            ) : (
              <ol className="flex flex-col gap-4">
                {detail.activity.map((entry) => (
                  <li key={entry.id} className="flex gap-4 border-b border-line pb-4 last:border-0">
                    <span className="tabular w-28 shrink-0 text-xs text-ink-faint">
                      {entry.createdAt.slice(0, 16).replace("T", " ")}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-ink">{entry.summary}</span>
                      {entry.fromValue || entry.toValue ? (
                        <span className="text-xs text-ink-muted">
                          {entry.fromValue ?? "—"} → {entry.toValue ?? "—"}
                        </span>
                      ) : null}
                      {entry.detail ? (
                        <span className="text-xs text-ink-muted">{entry.detail}</span>
                      ) : null}
                      <span className="text-xs text-ink-faint">{entry.actor}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Detaljer og interne notater">
            <form action={saveOrganizationAction} className="flex flex-col gap-4">
              <input type="hidden" name="organizationId" value={organization.id} />

              <div className="flex flex-col gap-1.5">
                <label className={label} htmlFor="contactName">Kontaktperson</label>
                <input id="contactName" name="contactName" defaultValue={organization.contactName ?? ""} className={field} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="email">E-post</label>
                  <input id="email" name="email" type="email" defaultValue={organization.email ?? ""} className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="phone">Telefon</label>
                  <input id="phone" name="phone" defaultValue={organization.phone ?? ""} className={field} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={label} htmlFor="organizationNumber">Organisasjonsnummer</label>
                <input id="organizationNumber" name="organizationNumber" inputMode="numeric" defaultValue={organization.organizationNumber ?? ""} className={field} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={label} htmlFor="address">Adresse</label>
                <input id="address" name="address" defaultValue={organization.address ?? ""} className={field} />
              </div>
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="postalCode">Postnr.</label>
                  <input id="postalCode" name="postalCode" inputMode="numeric" defaultValue={organization.postalCode ?? ""} className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="city">Sted</label>
                  <input id="city" name="city" defaultValue={organization.city ?? ""} className={field} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={label} htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={organization.status} className={field}>
                  {ORGANIZATION_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="nextAction">Neste handling</label>
                  <input id="nextAction" name="nextAction" defaultValue={organization.nextAction ?? ""} className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={label} htmlFor="nextActionAt">Frist</label>
                  <input id="nextActionAt" name="nextActionAt" type="date" defaultValue={organization.nextActionAt ?? ""} className={field} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <label className={label} htmlFor="internalNotes">Interne notater</label>
                  <InternalTag />
                </span>
                <textarea id="internalNotes" name="internalNotes" rows={4} defaultValue={organization.internalNotes ?? ""} className={field} />
              </div>

              <Button type="submit" size="sm" className="self-start">Lagre</Button>
            </form>
          </Panel>

          <Panel title="Intern økonomi" actions={<InternalTag />}>
            <dl className="flex flex-col divide-y divide-line">
              {[
                ["Enheter", formatNumber(economics.units)],
                ["Omsetning eks. mva.", formatCurrency(economics.revenueExVat)],
                ["Varekost", economics.cogs == null ? "—" : formatCurrency(economics.cogs)],
                ["Bruttofortjeneste", economics.grossProfit == null ? "—" : formatCurrency(economics.grossProfit)],
                ["Bruttomargin", economics.grossMargin == null ? "—" : formatPercent(economics.grossMargin, 1)],
                ["Til klubben", formatCurrency(economics.organizationProfit)],
              ].map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-ink-muted">{key}</dt>
                  <dd className="tabular text-sm text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
