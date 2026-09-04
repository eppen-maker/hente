"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Badge, PickupStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { confirmPickupAction, setOrderDeliveredAction, undoPickupAction } from "@/app/club/actions";
import type { TrackedSeller } from "@/lib/data/tracking";

type Filter = "all" | "outstanding" | "delivered" | "not-picked-up" | "picked-up";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "outstanding", label: "Gjenstår" },
  { key: "delivered", label: "Ferdig levert" },
  { key: "not-picked-up", label: "Ikke hentet" },
  { key: "picked-up", label: "Hentet" },
];

/**
 * One screen for the whole handover: search anyone, tap a customer to mark
 * delivered, confirm a seller's pickup. Everything updates optimistically so
 * it stays usable standing in a doorway on a phone.
 */
export function TrackingBoard({
  campaignId,
  sellers,
  teams,
}: {
  campaignId: string;
  sellers: TrackedSeller[];
  teams: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [team, setTeam] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  type Patch = { type: "delivery"; orderId: string; delivered: boolean } | { type: "pickup"; sellerId: string; pickedUp: boolean };

  const [rows, applyPatch] = useOptimistic(sellers, (state: TrackedSeller[], patch: Patch) =>
    state.map((seller) => {
      if (patch.type === "pickup") {
        if (seller.sellerId !== patch.sellerId) return seller;
        return {
          ...seller,
          pickupStatus: patch.pickedUp ? "PICKED_UP" : seller.ordered > 0 ? "READY" : "NOT_READY",
          pickedUpAt: patch.pickedUp ? new Date().toISOString() : null,
        };
      }
      if (!seller.orders.some((o) => o.orderId === patch.orderId)) return seller;
      const orders = seller.orders.map((o) =>
        o.orderId === patch.orderId ? { ...o, delivered: patch.delivered, deliveredAt: patch.delivered ? new Date().toISOString() : null } : o,
      );
      return { ...seller, orders, delivered: orders.filter((o) => o.delivered).reduce((n, o) => n + o.quantity, 0) };
    }),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((seller) => {
      if (team !== "all" && seller.teamId !== team) return false;
      if (q && !seller.search.includes(q)) return false;
      switch (filter) {
        case "outstanding":
          return seller.ordered > seller.delivered;
        case "delivered":
          return seller.ordered > 0 && seller.ordered === seller.delivered;
        case "not-picked-up":
          return seller.pickupStatus !== "PICKED_UP" && seller.ordered > 0;
        case "picked-up":
          return seller.pickupStatus === "PICKED_UP";
        default:
          return true;
      }
    });
  }, [rows, query, filter, team]);

  function toggleDelivery(orderId: string, delivered: boolean) {
    setError(null);
    startTransition(async () => {
      applyPatch({ type: "delivery", orderId, delivered });
      const result = await setOrderDeliveredAction(campaignId, orderId, delivered);
      if (!result.ok) setError(result.message);
    });
  }

  function togglePickup(seller: TrackedSeller) {
    setError(null);
    const pickedUp = seller.pickupStatus !== "PICKED_UP";
    startTransition(async () => {
      applyPatch({ type: "pickup", sellerId: seller.sellerId, pickedUp });
      const result = pickedUp
        ? await confirmPickupAction(campaignId, seller.sellerId, seller.ordered)
        : await undoPickupAction(campaignId, seller.sellerId);
      if (!result.ok) setError(result.message ?? "Kunne ikke oppdatere hentingen.");
    });
  }

  return (
    <Card>
      <div className="space-y-3 border-b border-navy-100 px-5 py-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk selger, kunde, lag, hentekode eller telefon…"
          className="field py-3 text-base"
          autoComplete="off"
        />
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-sm border px-2.5 py-1.5 text-xs transition",
                filter === item.key
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-navy-200 bg-white text-navy-500 hover:border-navy-900",
              )}
            >
              {item.label}
            </button>
          ))}
          {teams.length > 1 ? (
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="ml-auto rounded-sm border border-navy-200 bg-white px-2.5 py-1.5 text-xs text-navy-700"
            >
              <option value="all">Alle lag</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {error ? <p className="border-b border-navy-100 px-5 py-3 text-sm text-red-700">{error}</p> : null}

      <ul className="divide-y divide-navy-100">
        {filtered.map((seller) => {
          const open = expanded === seller.sellerId;
          const complete = seller.ordered > 0 && seller.ordered === seller.delivered;

          return (
            <li key={seller.sellerId}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : seller.sellerId)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-sand-200/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-900">{seller.name}</p>
                  <p className="mt-0.5 text-sm text-navy-400">
                    {seller.teamName} · {seller.orders.length} kunder · kode {seller.pickupCode ?? seller.sellerCode}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PickupStatusBadge status={seller.pickupStatus} />
                    {complete ? <Badge variant="positive">Alt levert</Badge> : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="tabular text-lg font-semibold text-navy-900">
                    {seller.delivered}
                    <span className="text-navy-300"> / {seller.ordered}</span>
                  </p>
                  <p className="text-xs text-navy-400">utlevert</p>
                </div>
                <span aria-hidden className="text-navy-300">
                  {open ? "−" : "+"}
                </span>
              </button>

              {open ? (
                <div className="border-t border-navy-100 bg-sand-200/40 px-5 py-4">
                  <ul className="space-y-2">
                    {seller.orders.map((order) => (
                      <li
                        key={order.orderId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-navy-100 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-navy-900">{order.customerName}</p>
                          <p className="tabular text-sm text-navy-400">
                            {order.quantity} stk
                            {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                            {order.invoiced ? " · faktureres klubben" : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={order.delivered ? "secondary" : "primary"}
                          onClick={() => toggleDelivery(order.orderId, !order.delivered)}
                        >
                          {order.delivered ? "Angre" : "Utlevert"}
                        </Button>
                      </li>
                    ))}
                    {!seller.orders.length ? (
                      <li className="py-2 text-sm text-navy-400">Ingen bestillinger ennå.</li>
                    ) : null}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-4">
                    <span className="text-sm text-navy-500">
                      {seller.pickupStatus === "PICKED_UP" && seller.pickedUpAt
                        ? `Hentet ${new Date(seller.pickedUpAt).toLocaleString("nb-NO")}`
                        : `${seller.ordered} produkter å hente ut`}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={seller.pickupStatus === "PICKED_UP" ? "secondary" : "primary"}
                      className="ml-auto"
                      disabled={seller.ordered === 0}
                      onClick={() => togglePickup(seller)}
                    >
                      {seller.pickupStatus === "PICKED_UP" ? "Angre henting" : `Bekreft ${seller.ordered} utlevert`}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}

        {!filtered.length ? (
          <li className="px-5 py-12 text-center text-navy-400">Ingen treff.</li>
        ) : null}
      </ul>
    </Card>
  );
}
