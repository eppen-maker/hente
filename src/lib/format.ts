/**
 * Norwegian number formatting.
 *
 * Implemented by hand rather than via `Intl` so the output is byte-identical
 * on the server and in the browser (no ICU-version drift, no hydration
 * mismatch). Groups are separated by a non-breaking space, per Norwegian
 * convention: 6 000, 480 000 kr.
 */

const GROUP_SEPARATOR = " ";
const DECIMAL_SEPARATOR = ",";

export interface NumberFormatOptions {
  /** Fixed number of decimals. Default 0. */
  decimals?: number;
  /** Prefix negative values with a minus sign. Default true. */
  signed?: boolean;
}

export function formatNumber(
  value: number,
  { decimals = 0, signed = true }: NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return "–";

  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [integerPart = "0", fractionPart] = fixed.split(".");

  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  const body = fractionPart
    ? `${grouped}${DECIMAL_SEPARATOR}${fractionPart}`
    : grouped;

  return negative && signed ? `−${body}` : body;
}

export interface CurrencyFormatOptions extends NumberFormatOptions {
  /** Currency suffix. Default "kr". */
  suffix?: string;
}

/** 480000 → "480 000 kr" */
export function formatCurrency(
  value: number,
  { suffix = "kr", ...rest }: CurrencyFormatOptions = {},
): string {
  return `${formatNumber(value, rest)} ${suffix}`;
}

/**
 * Compact currency for tight mobile layouts: 480000 → "480 000 kr",
 * 1200000 → "1,2 mill. kr".
 */
export function formatCurrencyCompact(value: number, suffix = "kr"): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const decimals = abs >= 10_000_000 ? 0 : 1;
    return `${formatNumber(millions, { decimals })} mill. ${suffix}`;
  }
  return formatCurrency(value, { suffix });
}

/** 0.4 → "40 %" */
export function formatPercent(ratio: number, decimals = 0): string {
  return `${formatNumber(ratio * 100, { decimals })} %`;
}

/** Norwegian plural helper: 1 produkt / 2 produkter. */
export function pluralize(count: number, singular: string, plural: string) {
  return Math.abs(count) === 1 ? singular : plural;
}

/** Parses user input like "6 000", "6.000" or "6000" into a number. */
export function parseNumberInput(input: string): number | null {
  const cleaned = input
    .replace(/[\s  .]/g, "")
    .replace(DECIMAL_SEPARATOR, ".")
    .trim();
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
