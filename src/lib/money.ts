/**
 * Decimal-safe money primitives.
 *
 * Every amount in SØRKYST is an integer number of øre (1 NOK = 100 øre),
 * so 199 NOK is represented as 19900. No floating point arithmetic is used
 * for money anywhere in the application.
 */

export type Ore = number;

export function assertOre(value: number, label = "amount"): Ore {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer number of øre, got ${value}`);
  if (!Number.isSafeInteger(value)) throw new Error(`${label} exceeds safe integer range`);
  return value;
}

/**
 * Kroner -> øre without float drift.
 *
 * `Math.round(1.005 * 100)` is 100 because 1.005 is not representable in
 * binary floating point, so the conversion goes through the decimal string
 * instead and rounds half-up on the third decimal.
 */
export function kronerToOre(kroner: number | string): Ore {
  const text = (typeof kroner === "number" ? kroner.toString() : kroner.trim().replace(",", ".")) || "0";
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) throw new Error(`Cannot convert "${kroner}" to øre`);

  const [, sign, whole, fraction = ""] = match;
  const padded = `${fraction}000`.slice(0, 3);
  const ore = Number(whole || "0") * 100 + Number(padded.slice(0, 2));
  const rounded = ore + (Number(padded[2]) >= 5 ? 1 : 0);
  return sign === "-" ? -rounded : rounded;
}

export function oreToKroner(ore: Ore): number {
  return ore / 100;
}

/** Half-up rounding for integer division, correct for negative numerators too. */
export function divideRound(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("division by zero");
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  return sign * Math.floor((n * 2 + d) / (2 * d));
}

export function multiply(ore: Ore, quantity: number): Ore {
  assertOre(ore);
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("quantity must be a non-negative integer");
  return assertOre(ore * quantity, "product");
}

export function sum(values: Ore[]): Ore {
  return values.reduce((acc, v) => acc + assertOre(v), 0);
}

const nokFormatter = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
const nokDecimalFormatter = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "199 kr" for whole kroner, "199,50 kr" when there are øre. */
export function formatOre(ore: Ore, options: { suffix?: string } = {}): string {
  const suffix = options.suffix ?? " kr";
  const whole = ore % 100 === 0;
  const value = whole ? nokFormatter.format(ore / 100) : nokDecimalFormatter.format(ore / 100);
  return `${value}${suffix}`;
}

export function formatOreCompact(ore: Ore): string {
  return formatOre(ore, { suffix: "" });
}

export function formatNumber(value: number): string {
  return nokFormatter.format(value);
}

/** CSV-friendly decimal string, e.g. 19900 -> "199.00". */
export function oreToDecimalString(ore: Ore): string {
  const sign = ore < 0 ? "-" : "";
  const abs = Math.abs(ore);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
