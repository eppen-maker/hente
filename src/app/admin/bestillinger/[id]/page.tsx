import { notFound } from "next/navigation";

import {
  AdminPage,
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
import { aggregateEconomics } from "@/lib/admin/economics";
import { ORDER_STATUSES, orderStatus } from "@/lib/admin/status";
import {
  getOrder,
  listActivity,
  listAdminProducts,
  listOrganizations,
} from "@/lib/repositories/admin";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { changeOrderStatusAction } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrder(id);
  return { title: order?.orderNumber ?? "Bestilling" };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const [products, organizations, activity] = await Promise.all([
    listAdminProducts(),
    listOrganizations(),
    listActivity({ entityType: "order", entityId: id, limit: 30 }),
  ]);

  const byId = new Map(products.map((product) => [product.id, product]));
  const organization = organizations.find((org) => org.id === order.organizationId);
  const status = orderStatus(order.status);
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const economics = aggregateEconomics(
    order.items.map((item) => {
      const product = byId.get(item.productId);
      return {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        organizationMargin: item.organizationMargin,
        vatRate: product?.vatRate ?? 0.25,
        landedCostExVat: product?.landedCostExVat ?? null,
      };
    }),
  );

  return (
    <AdminPage
      title={order.orderNumber}
      lead={`${order.organizationName} · ${String(order.createdAt ?? "").slice(0, 10)}`}
      actions={<StatusBadge label={status.label} tone={status.tone} />}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Antall produkter" value={formatNumber(units)} />
        <KpiCard label="Ordreverdi inkl. mva." value={formatCurrency(order.total)} />
        <KpiCard label="Herav mva." value={formatCurrency(order.vat)} />
        <KpiCard
          label="Til klubben"
          value={formatCurrency(order.organizationProfit)}
          emphasis
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Ordrelinjer" padding={false}>
            <Table minWidth="44rem">
              <thead>
                <tr>
                  <Th>Produkt</Th>
                  <Th align="right">Antall</Th>
                  <Th align="right">Innkjøp</Th>
                  <Th align="right">Utsalg</Th>
                  <Th align="right">Til klubben</Th>
                  <Th align="right">Linjesum</Th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <Td>{byId.get(item.productId)?.name ?? "Ukjent produkt"}</Td>
                    <Td align="right">{formatNumber(item.quantity)}</Td>
                    <Td align="right">{formatCurrency(item.unitPrice)}</Td>
                    <Td align="right">{formatCurrency(item.consumerPrice)}</Td>
                    <Td align="right">{formatCurrency(item.organizationMargin)}</Td>
                    <Td align="right">{formatCurrency(item.lineTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel title="Aktivitet">
            {activity.length === 0 ? (
              <p className="text-sm text-ink-muted">Ingen statusendringer ennå.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-4 border-b border-line pb-3 last:border-0">
                    <span className="tabular w-32 shrink-0 text-xs text-ink-faint">
                      {entry.createdAt.slice(0, 16).replace("T", " ")}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-ink">{entry.summary}</span>
                      {entry.fromValue || entry.toValue ? (
                        <span className="text-xs text-ink-muted">
                          {orderStatus(entry.fromValue as never).label} →{" "}
                          {orderStatus(entry.toValue as never).label}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Status">
            <form action={changeOrderStatusAction} className="flex flex-col gap-4">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                aria-label="Ordrestatus"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              >
                {ORDER_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <Button type="submit" size="sm" className="self-start">
                Oppdater status
              </Button>
              <p className="text-xs leading-relaxed text-ink-faint">
                Statusendringer logges automatisk, og oppdaterer leveransen når ordren
                sendes eller leveres.
              </p>
            </form>
          </Panel>

          <Panel title="Kontakt og levering">
            <dl className="flex flex-col divide-y divide-line text-sm">
              {[
                ["Organisasjon", organization ? organization.name : order.organizationName],
                ["Kontaktperson", order.contactName],
                ["E-post", order.email],
                ["Telefon", order.phone ?? "—"],
                ["Deltakere", formatNumber(order.participants)],
                ["Ønsket levering", order.requestedDeliveryDate ?? "—"],
                [
                  "Adresse",
                  [organization?.address, organization?.postalCode, organization?.city]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
              ].map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-ink-muted">{key}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {order.notes ? (
              <p className="mt-4 rounded-lg bg-sand p-3 text-sm leading-relaxed text-ink-soft">
                {order.notes}
              </p>
            ) : null}
            {organization ? (
              <p className="mt-4 text-sm">
                <RowLink href={`/admin/organisasjoner/${organization.id}`}>
                  Åpne organisasjonen
                </RowLink>
              </p>
            ) : null}
          </Panel>

          <Panel title="Intern økonomi" actions={<InternalTag />}>
            <dl className="flex flex-col divide-y divide-line text-sm">
              {[
                ["Omsetning eks. mva.", formatCurrency(economics.revenueExVat)],
                ["Varekost", economics.cogs == null ? "—" : formatCurrency(economics.cogs)],
                [
                  "Bruttofortjeneste",
                  economics.grossProfit == null ? "—" : formatCurrency(economics.grossProfit),
                ],
                [
                  "Bruttomargin",
                  economics.grossMargin == null ? "—" : formatPercent(economics.grossMargin, 1),
                ],
              ].map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-ink-muted">{key}</dt>
                  <dd className="tabular text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {economics.incomplete ? (
              <p className="mt-3 text-xs text-ink-muted">
                Produktet mangler innkjøpskost, så varekost og margin er ufullstendige.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
