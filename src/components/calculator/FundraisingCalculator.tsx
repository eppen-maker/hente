"use client";

import { useMemo } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NumberField } from "@/components/ui/NumberField";
import { cn } from "@/components/ui/cn";
import { buildStartCampaignHref } from "@/lib/calc/links";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ResultPanel } from "./ResultPanel";
import { VolumeOptions } from "./VolumeOptions";
import {
  useFundraisingCalculator,
  type CalculatorMode,
} from "./useFundraisingCalculator";

type SegmentValue = "per-participant" | "profit-goal";

const MODE_OPTIONS = [
  { value: "per-participant" as const, label: "Produkter per person", hint: "Vi vet hvor mye hver selger" },
  { value: "profit-goal" as const, label: "Ønsket fortjeneste", hint: "Vi vet hva vi trenger" },
];

interface FundraisingCalculatorProps {
  className?: string;
  /** Hides the quick-volume cards where a compact version is enough. */
  showVolumeOptions?: boolean;
  initialParticipants?: number;
}

export function FundraisingCalculator({
  className,
  showVolumeOptions = true,
  initialParticipants,
}: FundraisingCalculatorProps) {
  const calculator = useFundraisingCalculator({ initialParticipants });
  const {
    mode,
    setMode,
    participants,
    setParticipants,
    productsPerParticipant,
    setProductsPerParticipant,
    profitGoal,
    setProfitGoal,
    customVolume,
    setCustomVolume,
    selectVolume,
    projection,
    volumeOptions,
    limits,
  } = calculator;

  const segmentValue: SegmentValue = mode === "profit-goal" ? "profit-goal" : "per-participant";

  const handleModeChange = (next: SegmentValue) => {
    // Leaving a picked volume keeps the effort level the club just saw.
    if (mode === "total-volume" && next === "per-participant") {
      setProductsPerParticipant(projection.productsPerParticipant);
    }
    setMode(next as CalculatorMode);
  };

  const ctaHref = useMemo(() => buildStartCampaignHref(projection), [projection]);

  return (
    <div className={cn("flex flex-col gap-8 lg:gap-10", className)}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* Inputs */}
        <div className="flex flex-col gap-7 rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <NumberField
            label="Antall deltakere"
            value={participants}
            onChange={setParticipants}
            min={limits.participants.min}
            max={2_000}
            step={10}
            suffix="stk"
            slider
            sliderStep={10}
            helpText="Spillere, medlemmer og andre som er med på dugnaden."
          />

          <div className="flex flex-col gap-3">
            <span className="text-eyebrow text-ink-muted">Regn ut fra</span>
            <SegmentedControl
              label="Beregningsmåte"
              options={MODE_OPTIONS}
              value={segmentValue}
              onChange={handleModeChange}
            />
          </div>

          {segmentValue === "per-participant" ? (
            <NumberField
              label="Produkter per person"
              value={
                mode === "total-volume" ? projection.productsPerParticipant : productsPerParticipant
              }
              onChange={(value) => {
                setProductsPerParticipant(value);
                setMode("per-participant");
              }}
              min={limits.productsPerParticipant.min}
              max={40}
              step={1}
              suffix="stk"
              slider
              helpText={`Hver deltaker tjener ${formatCurrency(
                projection.profitPerProduct * projection.productsPerParticipant,
              )} til klubben.`}
            />
          ) : (
            <NumberField
              label="Ønsket fortjeneste"
              value={profitGoal}
              onChange={setProfitGoal}
              min={limits.profitGoal.min}
              max={2_000_000}
              step={10_000}
              suffix="kr"
              slider
              sliderStep={10_000}
              helpText={`Vi regner ut hvor mange produkter dere trenger, med ${formatCurrency(
                projection.profitPerProduct,
              )} i fortjeneste per produkt.`}
            />
          )}

          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-ink-faint">Utsalgspris</dt>
              <dd className="tabular text-ink">{formatCurrency(projection.pricing.consumerPrice)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-ink-faint">Klubbens innkjøp</dt>
              <dd className="tabular text-ink">
                {formatCurrency(projection.pricing.organizationPrice)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-ink-faint">Til klubben</dt>
              <dd className="tabular text-ink">
                {formatCurrency(projection.pricing.organizationMargin)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Live result */}
        <ResultPanel projection={projection} mode={mode} ctaHref={ctaHref} />
      </div>

      {showVolumeOptions ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="font-display text-xl text-ink sm:text-2xl">Vanlige volum</h3>
            <p className="text-sm text-ink-muted">
              Beregnet for {formatNumber(participants)} deltakere. Dere kan bestille
              hvilket som helst antall.
            </p>
          </div>
          <VolumeOptions
            options={volumeOptions}
            onSelect={selectVolume}
            customVolume={customVolume}
            onCustomVolumeChange={setCustomVolume}
            isCustomActive={mode === "total-volume"}
            limits={limits}
          />
        </div>
      ) : null}
    </div>
  );
}
