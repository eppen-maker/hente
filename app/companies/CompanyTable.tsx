"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Logo, StatusBadge } from "@/components/ui";
import { multiple, nok, pct, signedNok, compact } from "@/lib/format";

export interface CompanyRow {
  id: string;
  name: string;
  logoText: string;
  logoColor: string;
  identifier: string;
  sector: string;
  industry: string;
  listing: "LISTED" | "UNLISTED";
  status: string;
  revenue: number | null;
  revenueGrowth: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  netIncome: number | null;
  valuation: number | null;
  invested: number;
  ownership: number;
  currentValue: number | null;
  baseValue: number | null;
  upsideValue: number | null;
  baseMoic: number | null;
}

type SortKey = keyof Pick<
  CompanyRow,
  "name" | "revenue" | "revenueGrowth" | "ebitda" | "ebitdaMargin" | "netIncome" | "valuation" | "invested" | "ownership" | "currentValue" | "baseValue" | "upsideValue"
>;

const STATUSES = ["PORTFOLIO", "DUE_DILIGENCE", "WATCHLIST", "MONITORING", "PASSED"];

export function CompanyTable({ rows }: { rows: CompanyRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [sector, setSector] = useState<string>("ALL");
  const [listing, setListing] = useState<string>("ALL");
  const [onlyInvested, setOnlyInvested] = useState(false);
  const [sort, setSort] = useState<SortKey>("invested");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sectors = useMemo(() => Array.from(new Set(rows.map((r) => r.sector))).sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (needle && ![r.name, r.identifier, r.sector, r.industry].some((v) => v.toLowerCase().includes(needle))) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (sector !== "ALL" && r.sector !== sector) return false;
      if (listing !== "ALL" && r.listing !== listing) return false;
      if (onlyInvested && r.invested <= 0) return false;
      return true;
    });
    return out.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "string" || typeof bv === "string") {
        const cmp = String(av).localeCompare(String(bv));
        return dir === "asc" ? cmp : -cmp;
      }
      const an = av === null ? -Infinity : (av as number);
      const bn = bv === null ? -Infinity : (bv as number);
      return dir === "asc" ? an - bn : bn - an;
    });
  }, [rows, q, status, sector, listing, onlyInvested, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
  };

  const Th = ({ label, k, align = "right" }: { label: string; k: SortKey; align?: "left" | "right" }) => (
    <th className={align === "right" ? "text-right" : ""}>
      <button
        onClick={() => toggleSort(k)}
        className={`hover:text-ink ${sort === k ? "text-ink" : ""}`}
      >
        {label}
        {sort === k ? <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );

  const totals = filtered.reduce(
    (acc, r) => ({
      invested: acc.invested + r.invested,
      current: acc.current + (r.currentValue ?? 0),
      base: acc.base + (r.baseValue ?? 0),
    }),
    { invested: 0, current: 0, base: 0 },
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, org.nr, ticker, sector…"
          className="w-[280px]"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="ALL">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={listing} onChange={(e) => setListing(e.target.value)}>
          <option value="ALL">Listed & unlisted</option>
          <option value="LISTED">Listed</option>
          <option value="UNLISTED">Unlisted</option>
        </select>
        <label className="flex items-center gap-2 text-[12px] text-ink-2 ml-1">
          <input
            type="checkbox"
            checked={onlyInvested}
            onChange={(e) => setOnlyInvested(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Only where we have invested
        </label>
        <span className="text-[11.5px] text-ink-3 ml-auto">
          {filtered.length} of {rows.length} companies
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <Th label="Company" k="name" align="left" />
              <th>Status</th>
              <Th label="Revenue" k="revenue" />
              <Th label="Growth" k="revenueGrowth" />
              <Th label="EBITDA" k="ebitda" />
              <Th label="Margin" k="ebitdaMargin" />
              <Th label="Net income" k="netIncome" />
              <Th label="Valuation" k="valuation" />
              <Th label="Our investment" k="invested" />
              <Th label="Ownership" k="ownership" />
              <Th label="Current value" k="currentValue" />
              <Th label="Base value" k="baseValue" />
              <Th label="Upside value" k="upsideValue" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/companies/${r.id}`} className="flex items-center gap-2.5 group">
                    <Logo text={r.logoText} color={r.logoColor} size={28} />
                    <span>
                      <span className="block text-[12.5px] group-hover:underline">{r.name}</span>
                      <span className="block text-[10.5px] text-ink-3">
                        {r.identifier} · {r.sector} · {r.listing === "LISTED" ? "Listed" : "Unlisted"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="text-right num">{compact(r.revenue)}</td>
                <td className={`text-right num ${r.revenueGrowth !== null && r.revenueGrowth < 0 ? "text-[color:var(--neg)]" : ""}`}>
                  {pct(r.revenueGrowth, 0)}
                </td>
                <td className="text-right num">{compact(r.ebitda)}</td>
                <td className={`text-right num ${r.ebitdaMargin !== null && r.ebitdaMargin < 0 ? "text-[color:var(--neg)]" : ""}`}>
                  {pct(r.ebitdaMargin, 0)}
                </td>
                <td className="text-right num">{compact(r.netIncome)}</td>
                <td className="text-right num">{compact(r.valuation)}</td>
                <td className="text-right num">{r.invested > 0 ? nok(r.invested) : <span className="text-ink-3">—</span>}</td>
                <td className="text-right num">{r.ownership > 0 ? pct(r.ownership, 2) : <span className="text-ink-3">—</span>}</td>
                <td className="text-right num">{r.currentValue !== null ? nok(r.currentValue) : <span className="text-ink-3">—</span>}</td>
                <td className="text-right num text-ink-2">
                  {r.baseValue !== null ? compact(r.baseValue) : <span className="text-ink-3">—</span>}
                  {r.baseMoic !== null ? <span className="text-ink-3 ml-1.5">{multiple(r.baseMoic)}</span> : null}
                </td>
                <td className="text-right num text-ink-2">
                  {r.upsideValue !== null ? compact(r.upsideValue) : <span className="text-ink-3">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[color:var(--line-strong)]">
              <td colSpan={8} className="text-[11px] text-ink-3">
                Filtered total
              </td>
              <td className="text-right num">{nok(totals.invested)}</td>
              <td />
              <td className="text-right num">{nok(totals.current)}</td>
              <td className="text-right num text-ink-2">{compact(totals.base)}</td>
              <td className="text-right num text-ink-3">{signedNok(totals.base - totals.invested, { compact: true })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
