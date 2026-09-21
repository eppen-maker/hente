"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { clamp, formatNumber, parseNumberInput } from "@/lib/format";
import { cn } from "./cn";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Text shown after the value, e.g. "kr" or "stk". */
  suffix?: string;
  helpText?: string;
  /** Adds a range slider under the field. */
  slider?: boolean;
  sliderStep?: number;
  className?: string;
  inputMode?: "numeric" | "decimal";
}

/**
 * Number input with Norwegian formatting, stepper buttons and an optional
 * slider. Keeps a local string while focused so typing feels natural, then
 * formats and clamps on blur.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  helpText,
  slider = false,
  sliderStep,
  className,
  inputMode = "numeric",
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string>(() => formatNumber(value));
  const [lastValue, setLastValue] = useState(value);

  // Keep the displayed text in sync when the value changes from outside the
  // input (steppers, slider, another field) without overwriting what someone
  // is in the middle of typing.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseNumberInput(draft) !== value) setDraft(formatNumber(value));
  }

  const commit = (raw: string) => {
    const parsed = parseNumberInput(raw);
    const next = parsed === null ? min : clamp(Math.round(parsed), min, max);
    onChange(next);
    setDraft(formatNumber(next));
  };

  const nudge = (direction: 1 | -1) => {
    onChange(clamp(value + direction * step, min, max));
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <label htmlFor={id} className="text-eyebrow text-ink-muted">
        {label}
      </label>

      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-surface transition-colors focus-within:border-ink">
        <button
          type="button"
          aria-label={`Reduser ${label.toLowerCase()}`}
          onClick={() => nudge(-1)}
          disabled={value <= min}
          className="grid w-11 shrink-0 place-items-center border-r border-line text-ink-muted transition-colors hover:bg-sand hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent sm:w-12"
        >
          <Minus className="size-4" strokeWidth={1.5} />
        </button>

        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5 px-2 py-3">
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            value={draft}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                nudge(1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                nudge(-1);
              }
            }}
            className="tabular w-full min-w-0 bg-transparent text-center text-xl font-medium tracking-tight text-ink outline-none sm:text-2xl"
          />
          {suffix ? (
            <span className="shrink-0 text-sm text-ink-faint">{suffix}</span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={`Øk ${label.toLowerCase()}`}
          onClick={() => nudge(1)}
          disabled={value >= max}
          className="grid w-11 shrink-0 place-items-center border-l border-line text-ink-muted transition-colors hover:bg-sand hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent sm:w-12"
        >
          <Plus className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {slider ? (
        <input
          type="range"
          aria-label={`${label} (skyveknapp)`}
          min={min}
          max={max}
          step={sliderStep ?? step}
          value={clamp(value, min, max)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="range-brand mt-1"
        />
      ) : null}

      {helpText ? <p className="text-xs text-ink-faint">{helpText}</p> : null}
    </div>
  );
}
