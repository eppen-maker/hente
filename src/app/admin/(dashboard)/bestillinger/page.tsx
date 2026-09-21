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
import { cn } from "@/components/ui/cn";
import { ORDER_STATUSES, orderStatus } from "@/lib/admin/status";
import { listAdminProducts, listOrders } from "@/lib/repositories/admin";
import { formatCurrency, formatNumber } from "@/lib/format";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "Bestillinger" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = String(params.status ?? "alle");

  const [orders, products] = await Promise.all([listOrders(), listAdminProducts()]);
  const productName = (id: string) =>
    products.find((product) => product.id === id)?.name ?? "Ukjent produkt";

  const rows =
    statusFilter === "alle"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const href = (status: string) =>
    (status === "alle"
      ? "/admin/bestillinger"
      : `/admin/bestillinger?status=${status}`) as Route;

  return (
    <AdminPage
      title="Bestillinger"
      lead={`${formatNumber(orders.length)} bestillinger totalt.`}
    >
      <div className="flex flex-wrap gap-2">
        {[{ value: "alle", label: "Alle" }, ...ORDER_STATUSES].map((item) => (
          <Link
            key={item.value}
            href={href(item.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              statusFilter === item.value
                ? "border-ink bg-ink text-canvas"
                : "border-line-strong text-ink-muted hover:border-ink hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Panel padding={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Ingen bestillinger"
              body="Bestillinger fra dugnadslenkene dukker opp her."
            />
          </div>
        ) : (
          <Table minWidth="72rem">
            <thead>
              <tr>
                <Th>Ordrenummer</Th>
                <Th>Organisasjon</Th>
                <Th>Dato</Th>
                <Th>Produkter</Th>
                <Th align="right">Antall</Th>
                <Th align="right">Ordreverdi</Th>
                <Th align="right">Til klubben</Th>
                <Th>Levering</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const status = orderStatus(order.status);
                const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id}>
                    <Td>
                      <RowLink href={`/admin/bestillinger/${order.id}`}>
                        {order.orderNumber}
                      </RowLink>
                    </Td>
                    <Td>
                      {order.organizationName}
                      {order.campaignSlug ? (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          /dugnad/{order.campaignSlug}
                        </span>
                      ) : null}
                    </Td>
                    <Td>{String(order.createdAt ?? "").slice(0, 10)}</Td>
                    <Td>
                      {order.items.map((item) => productName(item.productId)).join(", ")}
                    </Td>
                    <Td align="right">{formatNumber(units)}</Td>
                    <Td align="right">{formatCurrency(order.total)}</Td>
                    <Td align="right">{formatCurrency(order.organizationProfit)}</Td>
                    <Td>{order.requestedDeliveryDate ?? "—"}</Td>
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
