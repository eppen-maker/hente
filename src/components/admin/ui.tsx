import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import type { StatusTone } from "@/lib/admin/status";

/** Shared building blocks for the CRM. Denser than the public site, same palette. */

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-canvas-deep text-ink-soft border-line-strong",
  progress: "bg-clay/40 text-ink border-clay",
  positive: "bg-sage/40 text-ink border-sage",
  warning: "bg-[#e8d5cd] text-[#7a3a26] border-[#d9b8ab]",
  muted: "bg-transparent text-ink-faint border-line",
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}

interface AdminPageProps {
  title: string;
  lead?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPage({ title, lead, actions, children }: AdminPageProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{title}</h1>
          {lead ? (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{lead}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

interface PanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padding = true,
}: PanelProps) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-soft", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg leading-tight text-ink">{title}</h2>
            {description ? (
              <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padding ? "p-5" : ""}>{children}</div>
    </section>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}

export function KpiCard({ label, value, sub, emphasis = false }: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-5",
        emphasis ? "border-ink bg-ink text-canvas" : "border-line bg-surface shadow-soft",
      )}
    >
      <span
        className={cn(
          "text-eyebrow",
          emphasis ? "text-canvas/55" : "text-ink-faint",
        )}
      >
        {label}
      </span>
      <span className="tabular font-display text-2xl leading-none sm:text-3xl">{value}</span>
      {sub ? (
        <span className={cn("text-xs", emphasis ? "text-canvas/60" : "text-ink-muted")}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/* Tables ------------------------------------------------------------------- */

export function Table({ children, minWidth = "56rem" }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "text-eyebrow border-b border-line px-4 py-3 font-medium text-ink-faint",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-line px-4 py-4 text-sm text-ink-soft",
        align === "right" && "tabular text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href as Route}
      className="font-medium text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong"
    >
      {children}
    </Link>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong p-8">
      <p className="font-display text-lg text-ink">{title}</p>
      {body ? <p className="max-w-prose text-sm text-ink-muted">{body}</p> : null}
    </div>
  );
}

/** Internal-only marker, so admin-only figures are never mistaken for public. */
export function InternalTag() {
  return (
    <span className="text-eyebrow rounded-sm bg-ink px-1.5 py-0.5 text-canvas">
      Internt
    </span>
  );
}
