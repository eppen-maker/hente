"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { NumberField } from "@/components/ui/NumberField";
import { cn } from "@/components/ui/cn";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { UseFundraisingCalculator, VolumeOption } from "./useFundraisingCalculator";

interface VolumeOptionsProps {
  options: VolumeOption[];
  onSelect: (volume: number) => void;
  customVolume: number;
  onCustomVolumeChange: (value: number) => void;
  isCustomActive: boolean;
  limits: UseFundraisingCalculator["limits"];
  className?: string;
}

function VolumeCard({ option, onSelect }: { option: VolumeOption; onSelect: (v: number) => void }) {
  const { volume, projection, recommended, selected } = option;

  return (
    <button
      type="button"
      onClick={() => onSelect(volume)}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col justify-between gap-4 rounded-lg border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:p-5",
        selected
          ? "border-ink bg-ink text-canvas shadow-lift"
          : "border-line bg-surface hover:border-line-strong hover:shadow-soft",
      )}
    >
      {recommended && !selected ? (
        <span className="text-eyebrow absolute -top-2 left-4 rounded-full bg-clay px-2.5 py-1 text-ink">
          Anbefalt
        </span>
      ) : null}
      {selected ? (
        <span className="absolute top-4 right-4">
          <Check className="size-4" strokeWidth={1.5} />
        </span>
      ) : null}

      <div>
        <p className={cn("tabular font-display text-2xl leading-none sm:text-[1.6rem]")}>
          {formatNumber(volume)}
        </p>
        <p
          className={cn(
            "mt-1 text-xs",
            selected ? "text-canvas/60" : "text-ink-faint",
          )}
        >
          produkter
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className={cn("tabular text-sm font-medium", selected ? "text-canvas" : "text-ink")}>
          {formatCurrency(projection.organizationProfit)}
        </p>
        <p className={cn("text-xs", selected ? "text-canvas/60" : "text-ink-muted")}>
          {formatNumber(projection.productsPerParticipant)} per deltaker
        </p>
      </div>
    </button>
  );
}

export function VolumeOptions({
  options,
  onSelect,
  customVolume,
  onCustomVolumeChange,
  isCustomActive,
  limits,
  className,
}: VolumeOptionsProps) {
  const matchesQuickOption = options.some((option) => option.volume === customVolume);
  const [customOpen, setCustomOpen] = useState(false);
  const customSelected = isCustomActive && !matchesQuickOption;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {options.map((option) => (
          <VolumeCard key={option.volume} option={option} onSelect={onSelect} />
        ))}

        <button
          type="button"
          onClick={() => {
            setCustomOpen(true);
            onSelect(customVolume);
          }}
          aria-pressed={customSelected}
          className={cn(
            "flex flex-col justify-between gap-4 rounded-lg border border-dashed p-4 text-left transition-colors duration-200 sm:p-5",
            customSelected
              ? "border-ink bg-sand"
              : "border-line-strong bg-transparent hover:border-ink hover:bg-sand/50",
          )}
        >
          <SlidersHorizontal className="size-5 text-ink-muted" strokeWidth={1.5} />
          <div>
            <p className="font-display text-lg leading-tight text-ink">Tilpass antall</p>
            <p className="mt-1 text-xs text-ink-muted">Bestill akkurat det dere trenger</p>
          </div>
        </button>
      </div>

      {customOpen || customSelected ? (
        <div className="animate-fade rounded-lg border border-line bg-canvas-deep p-4 sm:p-5">
          <div className="grid gap-4 sm:max-w-sm">
            <NumberField
              label="Eget antall produkter"
              value={customVolume}
              onChange={(value) => {
                onCustomVolumeChange(value);
                onSelect(value);
              }}
              min={limits.customVolume.min}
              max={limits.customVolume.max}
              step={100}
              suffix="stk"
              helpText={`Minimum ${formatNumber(limits.customVolume.min)} produkter. Dere er aldri bundet til de faste antallene.`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
