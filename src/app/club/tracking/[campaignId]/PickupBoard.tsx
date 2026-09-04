"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { confirmPickupAction, undoPickupAction } from "@/app/club/actions";
import type { TrackedSeller } from "@/lib/data/tracking";

type Filter = "waiting" | "collected" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "waiting", label: "Må hente" },
  { key: "collected", label: "Har hentet" },
  { key: "all", label: "Alle" },
];

/**
 * The clubhouse overview: who still has to come and collect.
 *
 * One tap marks a seller as collected. Expanding a row shows the customer
 * names behind the number, so whoever hands out the goods can count them —
 * but ticking off individual customer deliveries is the seller's job, not the
 * club's, so it is not offered here.
 */
export function PickupBoard({
  campaignId,
  sellers,
  teams,
}: {
  campaignId: string;
  sellers: TrackedSeller[];
  teams: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("waiting");
  const [team, setTeam] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [rows, applyPatch] = useOptimistic(sellers, (state: TrackedSeller[], patch: { sellerId: string; pickedUp: boolean }) =>
    state.map((seller) =>
      seller.sellerId === patch.sellerId
        ? {
            ...seller,
            pickupStatus: patch.pickedUp ? "PICKED_UP" : seller.ordered > 0 ? "READY" : "NOT_READY",
            pickedUpAt: patch.pickedUp ? new Date().toISOString() : null,
          }
        : seller,
    ),
  );

  const counts = useMemo(
    () => ({
      waiting: rows.filter((s) => s.ordered > 0 && s.pickupStatus !== "PICKED_UP").length,
      collected: rows.filter((s) => s.pickupStatus === "PICKED_UP").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((seller) => {
      if (team !== "all" && seller.teamId !== team) return false;
      if (q && !seller.search.includes(q)) return false;
      if (filter === "waiting") return seller.ordered > 0 && seller.pickupStatus !== "PICKED_UP";
      if (filter === "collected") return seller.pickupStatus === "PICKED_UP";
      return true;
    });
  }, [rows, query, filter, team]);

  function togglePickup(seller: TrackedSeller) {
    setError(null);
    const pickedUp = seller.pickupStatus !== "PICKED_UP";
    startTransition(async () => {
      applyPatch({ sellerId: seller.sellerId, pickedUp });
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
          placeholder="Søk selger, lag, hentekode eller kunde…"
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
                "rounded-sm border px-3 py-1.5 text-xs transition",
                filter === item.key
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-navy-200 bg-white text-navy-500 hover:border-navy-900",
              )}
            >
              {item.label}
              {item.key !== "all" ? (
                <span className={cn("tabular ml-1.5", filter === item.key ? "text-white/60" : "text-navy-300")}>
                  {item.key === "waiting" ? counts.waiting : counts.collected}
                </span>
              ) : null}
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
          const collected = seller.pickupStatus === "PICKED_UP";

          return (
            <li key={seller.sellerId} className={cn(collected && "bg-emerald-50/40")}>
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : seller.sellerId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium text-navy-900">{seller.name}</p>
                  <p className="mt-0.5 text-sm text-navy-400">
                    {seller.teamName} · kode {seller.pickupCode ?? seller.sellerCode} · {seller.orders.length} kunder
                  </p>
                  {collected && seller.pickedUpAt ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      Hentet {new Date(seller.pickedUpAt).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : null}
                </button>

                <div className="text-right">
                  <p className="tabular text-2xl font-semibold text-navy-900">{seller.ordered}</p>
                  <p className="text-xs text-navy-400">produkter</p>
                </div>

                {collected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="positive">Hentet ✓</Badge>
                    <Button type="button" size="sm" variant="ghost" onClick={() => togglePickup(seller)}>
                      Angre
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="md" disabled={seller.ordered === 0} onClick={() => togglePickup(seller)}>
                    Hentet
                  </Button>
                )}
              </div>

              {open ? (
                <div className="border-t border-navy-100 bg-sand-200/40 px-5 py-4">
                  <p className="label">Bestillingene bak tallet</p>
                  <ul className="mt-2 space-y-1">
                    {seller.orders.map((order) => (
                      <li key={order.orderId} className="flex justify-between gap-4 text-sm">
                        <span className="text-navy-600">{order.customerName}</span>
                        <span className="tabular font-medium text-navy-900">{order.quantity}</span>
                      </li>
                    ))}
                    {!seller.orders.length ? <li className="text-sm text-navy-400">Ingen bestillinger ennå.</li> : null}
                  </ul>
                  <p className="mt-3 border-t border-navy-100 pt-2 text-sm text-navy-400">
                    Hvem som har fått varene sine holder {seller.name.split(" ")[0]} selv styr på i sin egen oversikt.
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}

        {!filtered.length ? (
          <li className="px-5 py-12 text-center text-navy-400">
            {filter === "waiting" ? "Alle har hentet 🎉" : "Ingen treff."}
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
