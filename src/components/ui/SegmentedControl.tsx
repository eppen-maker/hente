"use client";

import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Two-to-three way switch used for the calculator modes. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-1 rounded-lg border border-line bg-canvas-deep p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-3 py-2.5 text-sm transition-colors duration-200 sm:px-4",
              active
                ? "bg-ink text-canvas shadow-soft"
                : "text-ink-muted hover:bg-sand/60 hover:text-ink",
            )}
          >
            <span className="block font-medium tracking-tight">{option.label}</span>
            {option.hint ? (
              <span
                className={cn(
                  "mt-0.5 block text-[0.7rem] leading-tight",
                  active ? "text-canvas/60" : "text-ink-faint",
                )}
              >
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
