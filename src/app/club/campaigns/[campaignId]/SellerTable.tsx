"use client";

import { useMemo, useState } from "react";
import { Badge, PickupStatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatNumber, formatOre } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { SellerRow, TeamBreakdownRow } from "@/lib/data/club";

type Filter = "all" | "not-picked-up" | "picked-up" | "target-reached" | "target-missed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "not-picked-up", label: "Ikke hentet" },
  { key: "picked-up", label: "Hentet" },
  { key: "target-reached", label: "Mål nådd" },
  { key: "target-missed", label: "Mål ikke nådd" },
];

export function SellerTable({ rows, teams }: { rows: SellerRow[]; teams: TeamBreakdownRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [team, setTeam] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (team !== "all" && row.teamId !== team) return false;
      if (q && !row.name.toLowerCase().includes(q) && !row.sellerCode.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "not-picked-up":
          return row.pickupStatus !== "PICKED_UP";
        case "picked-up":
          return row.pickupStatus === "PICKED_UP";
        case "target-reached":
          return row.targetReached;
        case "target-missed":
          return !row.targetReached;
        default:
          return true;
      }
    });
  }, [rows, filter, team, query]);

  return (
    <Card>
      <CardHeader title="Selgere" subtitle={`${filtered.length} av ${rows.length}`} />

      <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 px-5 py-3">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-sm border px-2.5 py-1 text-xs transition",
              filter === item.key
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-navy-200 bg-white text-navy-500 hover:border-navy-900",
            )}
          >
            {item.label}
          </button>
        ))}

        <select
          value={team}
          onChange={(event) => setTeam(event.target.value)}
          className="ml-auto rounded-sm border border-navy-200 bg-white px-2.5 py-1.5 text-xs text-navy-700"
        >
          <option value="all">Alle lag</option>
          {teams.map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.teamName}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk etter selger…"
          className="w-full rounded-sm border border-navy-200 px-2.5 py-1.5 text-sm outline-none focus:border-navy-900 sm:w-48"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left">
              {["Selger", "Lag", "Solgt", "Kunder", "Til klubben", "Betaling", "Henting"].map((head) => (
                <th key={head} className="label px-5 py-2.5 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {filtered.map((row) => (
              <tr key={row.sellerId} className="hover:bg-sand-200/60">
                <td className="px-5 py-3">
                  <span className="font-medium text-navy-900">{row.name}</span>
                  <span className="ml-2 text-xs text-navy-300">{row.pickupCode ?? row.sellerCode}</span>
                </td>
                <td className="px-5 py-3 text-navy-500">{row.teamName}</td>
                <td className="tabular px-5 py-3 font-medium">
                  {formatNumber(row.quantity)}
                  {row.salesTarget > 0 ? <span className="text-navy-300"> / {row.salesTarget}</span> : null}
                </td>
                <td className="tabular px-5 py-3 text-navy-500">{row.customers}</td>
                <td className="tabular px-5 py-3">{formatOre(row.clubEarning)}</td>
                <td className="px-5 py-3">
                  {row.hasPendingPayments ? <Badge variant="warning">Delvis betalt</Badge> : <Badge variant="positive">Betalt</Badge>}
                </td>
                <td className="px-5 py-3">
                  <PickupStatusBadge status={row.pickupStatus} />
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-navy-400">
                  Ingen selgere matcher filteret.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
