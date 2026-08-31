"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import type { OrderCalculation } from "@/lib/calc/order";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { OrderCampaignContext } from "./context";

interface SummaryProps {
  calculation: OrderCalculation;
  campaign: OrderCampaignContext | null;
  organizationName: string;
  productName: string;
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={cn("text-sm", tone === "muted" ? "text-ink-faint" : "text-ink-muted")}>
        {label}
      </dt>
      <dd className="tabular text-right text-sm text-ink">{value}</dd>
    </div>
  );
}

/** Sticky desktop summary. The profit is the number that carries the page. */
export function OrderSummaryPanel({
  calculation,
  campaign,
  organizationName,
  productName,
}: SummaryProps) {
  const hasQuantity = calculation.quantity > 0;

  return (
    <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
        <div className="border-b border-line px-7 pt-7 pb-6">
          <span className="text-eyebrow text-ink-muted">Estimert fortjeneste</span>
          <p
            className="tabular mt-3 font-display leading-[0.95] text-ink"
            style={{ fontSize: "clamp(2.25rem, 3.2vw, 3rem)" }}
          >
            {formatCurrency(calculation.organizationProfit)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {hasQuantity ? (
              <>
                {formatNumber(calculation.quantity)} produkter ·{" "}
                {formatNumber(calculation.productsPerParticipant)} per deltaker
              </>
            ) : (
              "Velg antall for å se fortjenesten."
            )}
          </p>
        </div>

        <dl className="divide-y divide-line px-7 py-3">
          <Row label="Organisasjon" value={organizationName || "—"} />
          {campaign ? <Row label="Dugnad" value={campaign.name} /> : null}
          <Row label="Deltakere" value={formatNumber(calculation.participants)} />
          <Row label="Produkt" value={productName} />
          <Row
            label="Utsalgspris"
            value={formatCurrency(calculation.consumerPrice)}
            tone="muted"
          />
          <Row
            label="Klubbens innkjøp"
            value={formatCurrency(calculation.unitPrice)}
            tone="muted"
          />
          <Row
            label="Til klubben per produkt"
            value={formatCurrency(calculation.organizationMargin)}
            tone="muted"
          />
        </dl>

        <div className="border-t border-line bg-canvas-deep px-7 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-muted">Å betale</span>
            <span className="tabular font-display text-xl text-ink">
              {formatCurrency(calculation.total)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Inkl. mva. Faktureres etter levering.
          </p>
        </div>
      </div>
    </aside>
  );
}

interface MobileBarProps extends SummaryProps {
  ctaLabel: string;
  onContinue: () => void;
  disabled?: boolean;
  pending?: boolean;
}

/** Compact sticky summary for phones: the profit, and the way forward. */
export function OrderSummaryBar({
  calculation,
  ctaLabel,
  onContinue,
  disabled,
  pending,
}: MobileBarProps) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[0.7rem] tracking-wide text-ink-faint uppercase">
            Til klubben
          </span>
          <p className="tabular truncate font-display text-xl leading-tight text-ink">
            {formatCurrency(calculation.organizationProfit)}
          </p>
        </div>
        <Button onClick={onContinue} disabled={disabled || pending} className="shrink-0">
          {pending ? "Sender …" : ctaLabel}
          <ArrowRight className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
