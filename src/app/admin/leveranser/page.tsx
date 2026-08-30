import { AdminPage, EmptyState, Panel, RowLink, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { DELIVERY_STATUSES, deliveryStatus } from "@/lib/admin/status";
import { listDeliveries, listOrders, listOrganizations } from "@/lib/repositories/admin";
import { formatNumber } from "@/lib/format";
import { updateDeliveryAction } from "../actions";

export const metadata = { title: "Leveranser" };

const control =
  "rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-ink";

export default async function DeliveriesPage() {
  const [deliveries, orders, organizations] = await Promise.all([
    listDeliveries(),
    listOrders(),
    listOrganizations(),
  ]);

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const orgName = (id: string) => organizations.find((org) => org.id === id)?.name ?? "—";
  const address = (id: string) => {
    const org = organizations.find((item) => item.id === id);
    return [org?.address, org?.postalCode, org?.city].filter(Boolean).join(", ") || "—";
  };

  const sorted = [...deliveries].sort((a, b) =>
    String(a.requestedDate ?? "9999").localeCompare(String(b.requestedDate ?? "9999")),
  );

  return (
    <AdminPage
      title="Leveranser"
      lead="Alle bestillinger som ikke er kansellert, sortert etter ønsket leveringsdato."
    >
      <Panel padding={false}>
        {sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Ingen leveranser"
              body="Leveranser opprettes automatisk når en bestilling kommer inn."
            />
          </div>
        ) : (
          <Table minWidth="82rem">
            <thead>
              <tr>
                <Th>Organisasjon</Th>
                <Th>Ordre</Th>
                <Th align="right">Antall</Th>
                <Th>Ønsket dato</Th>
                <Th>Leveringsadresse</Th>
                <Th>Status</Th>
                <Th>Planlegg</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((delivery) => {
                const order = orderById.get(delivery.orderId);
                const status = deliveryStatus(delivery.status);

                return (
                  <tr key={delivery.id}>
                    <Td>{orgName(delivery.organizationId)}</Td>
                    <Td>
                      {order ? (
                        <RowLink href={`/admin/bestillinger/${order.id}`}>
                          {order.orderNumber}
                        </RowLink>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td align="right">{formatNumber(delivery.quantity)}</Td>
                    <Td>{delivery.requestedDate ?? "Ikke satt"}</Td>
                    <Td>{address(delivery.organizationId)}</Td>
                    <Td>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </Td>
                    <Td>
                      <form
                        action={updateDeliveryAction}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="orderId" value={delivery.orderId} />
                        <select
                          name="status"
                          defaultValue={delivery.status}
                          aria-label="Leveransestatus"
                          className={control}
                        >
                          {DELIVERY_STATUSES.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          name="confirmedDate"
                          defaultValue={delivery.confirmedDate ?? ""}
                          aria-label="Bekreftet dato"
                          className={control}
                        />
                        <input
                          name="trackingReference"
                          defaultValue={delivery.trackingReference ?? ""}
                          placeholder="Referanse"
                          aria-label="Referanse"
                          className={`${control} w-28`}
                        />
                        <input
                          name="notes"
                          defaultValue={delivery.notes ?? ""}
                          placeholder="Notat"
                          aria-label="Notat"
                          className={`${control} w-32`}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-line-strong px-2 py-1 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
                        >
                          Lagre
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
    </AdminPage>
  );
}
