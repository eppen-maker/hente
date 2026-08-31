"use client";

import { ArrowUpRight, Info } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { formatCurrency, formatNumber, pluralize } from "@/lib/format";
import type { CampaignProjection } from "@/types";
import type { CalculatorMode } from "./useFundraisingCalculator";

interface ResultPanelProps {
  projection: CampaignProjection;
  mode: CalculatorMode;
  /** Link that carries the current numbers into the enquiry form. */
  ctaHref: string;
  ctaLabel?: string;
  className?: string;
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:py-0">
      <span className="text-eyebrow text-ink-faint">{label}</span>
      <span className="tabular font-display text-2xl leading-none text-ink sm:text-[1.75rem]">
        {value}
      </span>
      {sub ? <span className="text-xs text-ink-muted">{sub}</span> : null}
    </div>
  );
}

export function ResultPanel({
  projection,
  mode,
  ctaHref,
  ctaLabel = "Bestill dugnad",
  className,
}: ResultPanelProps) {
  const {
    participants,
    productsPerParticipant,
    totalProducts,
    organizationProfit,
    profitPerProduct,
    profitGoal,
    roundedUp,
  } = projection;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lift",
        className,
      )}
    >
      {/* Headline result */}
      <div className="border-b border-line px-6 pt-8 pb-7 sm:px-9 sm:pt-10 sm:pb-8">
        <span className="text-eyebrow text-ink-muted">Til klubben</span>
        <p
          className="tabular mt-4 font-display leading-[0.92] text-ink"
          style={{ fontSize: "clamp(2.75rem, 8.5vw, 4.75rem)" }}
        >
          {formatCurrency(organizationProfit)}
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          {mode === "profit-goal" ? (
            <>
              Med {formatNumber(participants)} deltakere og{" "}
              {formatNumber(productsPerParticipant)}{" "}
              {pluralize(productsPerParticipant, "produkt", "produkter")} hver kan
              klubben tjene opptil {formatCurrency(organizationProfit)}.
            </>
          ) : (
            <>
              Kun {formatNumber(productsPerParticipant)}{" "}
              {pluralize(productsPerParticipant, "produkt", "produkter")} per deltaker.{" "}
              {formatCurrency(profitPerProduct)} rett til klubben per produkt.
            </>
          )}
        </p>
      </div>

      {/* Profit-goal callout */}
      {mode === "profit-goal" ? (
        <div className="border-b border-line bg-sand px-6 py-6 sm:px-9">
          <div className="flex flex-col gap-1.5">
            <span className="text-eyebrow text-ink-muted">Hver deltaker selger</span>
            <p className="tabular font-display text-3xl leading-none text-ink sm:text-4xl">
              {formatNumber(productsPerParticipant)}{" "}
              {pluralize(productsPerParticipant, "produkt", "produkter")} per deltaker
            </p>
          </div>
          {roundedUp && profitGoal ? (
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
              <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                Antall per deltaker rundes alltid opp til et helt produkt. Derfor
                havner dere litt over målet på {formatCurrency(profitGoal)} — med{" "}
                {formatCurrency(organizationProfit - profitGoal)} i margin.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Supporting numbers */}
      <div className="grid divide-y divide-line px-6 py-2 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-9 sm:py-7">
        <Stat
          label="Produkter"
          value={formatNumber(totalProducts)}
          sub={`${formatNumber(participants)} deltakere`}
        />
        <div className="sm:pl-6">
          <Stat
            label="Per deltaker"
            value={formatNumber(productsPerParticipant)}
            sub={`${formatCurrency(profitPerProduct * productsPerParticipant)} hver`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-canvas-deep px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <p className="text-xs leading-relaxed text-ink-muted">
          Veiledende beregning basert på gjeldende dugnadspris.
        </p>
        <ButtonLink href={ctaHref} size="md" className="shrink-0">
          {ctaLabel}
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </ButtonLink>
      </div>
    </div>
  );
}
