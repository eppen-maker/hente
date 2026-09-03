"use client";

import { useState, useTransition } from "react";
import { Badge, OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setDeliveryStatus } from "./actions";
import type { SellerOrderRow } from "@/lib/data/seller";

export function DeliveryList({ orders }: { orders: SellerOrderRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!orders.length) {
    return <p className="px-5 py-8 text-center text-sm text-navy-400">Ingen bestillinger ennå. Del lenken din!</p>;
  }

  function toggle(order: SellerOrderRow) {
    setBusyId(order.id);
    setError(null);
    startTransition(async () => {
      const result = await setDeliveryStatus(order.id, !order.delivered);
      if (!result.ok) setError(result.error);
      setBusyId(null);
    });
  }

  return (
    <div>
      {error ? <p className="px-5 pt-4 text-sm text-red-700">{error}</p> : null}
      <ul className="divide-y divide-navy-100">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium text-navy-900">{order.customerName}</p>
              <p className="tabular mt-0.5 text-sm text-navy-400">{order.quantity} stk</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <OrderStatusBadge status={order.status} />
                {order.delivered ? <Badge variant="positive">Levert ✓</Badge> : <Badge>Ikke levert</Badge>}
              </div>
            </div>

            {order.paid ? (
              <Button
                type="button"
                size="sm"
                variant={order.delivered ? "secondary" : "primary"}
                disabled={pending && busyId === order.id}
                onClick={() => toggle(order)}
              >
                {pending && busyId === order.id ? "Lagrer…" : order.delivered ? "Angre levering" : "Merk som levert"}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
