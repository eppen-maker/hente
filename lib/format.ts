export const NA = "DATA UNAVAILABLE";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("nb-NO", { minimumFractionDigits: min, maximumFractionDigits: max });

/** NOK 1 234 567 */
export function nok(v: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  if (opts.compact) return `NOK ${compact(v)}`;
  const sign = v < 0 ? "−" : "";
  return `${sign}NOK ${nf(0, 0).format(Math.abs(Math.round(v)))}`;
}

/** 61.4m / 1.2bn – used in charts and dense tables. */
export function compact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (a >= 1e9) return `${sign}${nf(0, 2).format(a / 1e9)}bn`;
  if (a >= 1e6) return `${sign}${nf(0, 1).format(a / 1e6)}m`;
  if (a >= 1e3) return `${sign}${nf(0, 0).format(a / 1e3)}k`;
  return `${sign}${nf(0, 0).format(a)}`;
}

export function num(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  return nf(decimals, decimals).format(v);
}

/** 0.264 → 26.4% */
export function pct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  return `${nf(decimals, decimals).format(v * 100)}%`;
}

export function signedPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${nf(decimals, decimals).format(Math.abs(v) * 100)}%`;
}

export function signedNok(v: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  const body = opts.compact ? compact(Math.abs(v)) : nf(0, 0).format(Math.abs(Math.round(v)));
  return `${s}NOK ${body}`;
}

export function multiple(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  return `${nf(decimals, decimals).format(v)}x`;
}

export function date(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** Level figures (revenue, EBITDA, equity) are only coloured when negative — a
 *  reported figure is not a gain. Use toneOf for changes and profits. */
export function negTone(v: number | null | undefined): "neg" | "flat" {
  return v !== null && v !== undefined && Number.isFinite(v) && v < 0 ? "neg" : "flat";
}

export function toneOf(v: number | null | undefined): "pos" | "neg" | "flat" {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "flat";
  return v > 0 ? "pos" : "neg";
}

export const STATUS_LABEL: Record<string, string> = {
  PORTFOLIO: "Portfolio",
  WATCHLIST: "Watchlist",
  DUE_DILIGENCE: "Due diligence",
  MONITORING: "Monitoring",
  PASSED: "Passed",
};
