import Link from "next/link";
import type { ReactNode } from "react";
import { NA, nok, pct, signedNok, signedPct } from "@/lib/format";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={`card ${padded ? "p-5" : ""} ${className}`}>{children}</div>;
}

export function SectionTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="text-[11.5px] text-ink-3 mt-0.5">{hint}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-7">
      <div>
        {eyebrow ? <div className="label mb-2">{eyebrow}</div> : null}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle ? <p className="text-ink-2 mt-1.5 text-[13px] max-w-2xl">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

/** The four data classes, rendered consistently everywhere. */
export function DataTag({ kind }: { kind: "RAW" | "CALCULATED" | "ASSUMPTION" | "AI" | "GAP" }) {
  const map: Record<string, string> = {
    RAW: "border-[var(--line-strong)] text-ink-3",
    CALCULATED: "border-[var(--line-strong)] text-ink-2",
    ASSUMPTION: "border-[color:var(--warn)] text-[color:var(--warn)]",
    AI: "border-[color:var(--accent)] text-[color:var(--accent)]",
    GAP: "border-[color:var(--neg)] text-[color:var(--neg)]",
  };
  const label = kind === "AI" ? "INTERPRETATION" : kind === "GAP" ? "MISSING" : kind;
  return (
    <span className={`inline-block border px-1.5 py-[1px] rounded-[2px] text-[9.5px] tracking-[0.09em] font-medium ${map[kind]}`}>
      {label}
    </span>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone = "flat",
  tag,
  scenario = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "flat";
  tag?: "RAW" | "CALCULATED" | "ASSUMPTION" | "AI";
  scenario?: boolean;
}) {
  const color = tone === "pos" ? "text-[color:var(--pos)]" : tone === "neg" ? "text-[color:var(--neg)]" : "text-ink";
  return (
    <div className={`card p-4 ${scenario ? "border-dashed" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="label leading-tight min-h-[26px]">{label}</div>
        {tag ? <DataTag kind={tag} /> : null}
      </div>
      <div className={`num text-[20px] mt-2.5 font-medium ${color} ${value === NA ? "text-ink-3 text-[12px]" : ""}`}>
        {value}
      </div>
      {sub ? <div className="text-[11px] text-ink-3 mt-1">{sub}</div> : null}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "flat" }) {
  const color = tone === "pos" ? "text-[color:var(--pos)]" : tone === "neg" ? "text-[color:var(--neg)]" : "text-ink";
  return (
    <div className="py-2.5 flex items-baseline justify-between gap-6 border-t border-[color:var(--line)] first:border-t-0">
      <span className="text-[12px] text-ink-2">{label}</span>
      <span className={`num text-[12.5px] ${color} ${value === NA ? "text-ink-3 text-[10.5px]" : ""}`}>{value}</span>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  PORTFOLIO: "bg-[color:var(--accent-soft)] text-[color:var(--accent)] border-[color:var(--accent)]",
  WATCHLIST: "text-ink-2 border-[color:var(--line-strong)]",
  DUE_DILIGENCE: "text-[color:var(--warn)] border-[color:var(--warn)]",
  MONITORING: "text-ink-2 border-[color:var(--line-strong)]",
  PASSED: "text-ink-3 border-[color:var(--line)]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block border px-2 py-[2px] rounded-[2px] text-[10px] tracking-[0.07em] font-medium uppercase ${STATUS_STYLE[status] ?? "text-ink-2 border-[color:var(--line-strong)]"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function Pill({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-block border rounded-[2px] px-2 py-[2px] text-[10.5px] tracking-[0.04em] ${muted ? "text-ink-3 border-[color:var(--line)]" : "text-ink-2 border-[color:var(--line-strong)]"}`}
    >
      {children}
    </span>
  );
}

export function Logo({ text, color, size = 34 }: { text: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[3px] text-white font-medium shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
    >
      {text}
    </div>
  );
}

export function Money({ value, signed = false, tone = true }: { value: number | null; signed?: boolean; tone?: boolean }) {
  const t = tone && value !== null ? (value > 0 ? "text-[color:var(--pos)]" : value < 0 ? "text-[color:var(--neg)]" : "") : "";
  return <span className={`num ${signed ? t : ""}`}>{signed ? signedNok(value) : nok(value)}</span>;
}

export function Pctg({ value, signed = false }: { value: number | null; signed?: boolean }) {
  const t = value !== null && signed ? (value > 0 ? "text-[color:var(--pos)]" : value < 0 ? "text-[color:var(--neg)]" : "") : "";
  return <span className={`num ${t}`}>{signed ? signedPct(value) : pct(value)}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-[12px] text-ink-3 py-6 text-center border border-dashed rounded-[3px]">{children}</div>;
}

export function ScenarioNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[11px] text-ink-3 leading-relaxed border-l-2 border-[color:var(--line-strong)] pl-3">
      {children ??
        "Scenario values are sensitivity analysis based on assumptions we have entered. They are not forecasts, not guarantees, and must never be read as current value."}
    </p>
  );
}

export function LinkButton({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center h-8 px-3 rounded-[3px] text-[12px] border transition-colors ${
        primary
          ? "bg-[color:var(--accent)] text-[color:var(--bg)] border-[color:var(--accent)] hover:opacity-90"
          : "border-[color:var(--line-strong)] text-ink-2 hover:text-ink hover:border-[color:var(--ink-3)]"
      }`}
    >
      {children}
    </Link>
  );
}

export function Bar({ share, color }: { share: number; color?: string }) {
  return (
    <div className="h-[6px] w-full bg-[color:var(--surface-2)] rounded-[2px] overflow-hidden">
      <div
        className="h-full rounded-[2px]"
        style={{ width: `${Math.min(100, Math.max(0, share * 100))}%`, background: color ?? "var(--chart-1)" }}
      />
    </div>
  );
}
