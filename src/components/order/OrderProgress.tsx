"use client";

import { Check } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { ORDER_STEPS, type OrderStepId } from "./context";

interface OrderProgressProps {
  current: OrderStepId;
  /** Highest step reached, so completed steps stay clickable. */
  furthest: OrderStepId;
  onNavigate: (step: OrderStepId) => void;
}

export function OrderProgress({ current, furthest, onNavigate }: OrderProgressProps) {
  return (
    <nav aria-label="Fremdrift">
      <ol className="flex items-center gap-1 sm:gap-2">
        {ORDER_STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          const reachable = step.id <= furthest;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => reachable && onNavigate(step.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 items-center gap-2 rounded-md py-1.5 text-left transition-colors",
                  reachable ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-medium transition-colors",
                    active && "border-ink bg-ink text-canvas",
                    done && "border-ink bg-ink text-canvas",
                    !active && !done && "border-line-strong text-ink-faint",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={2} /> : step.id}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-sm tracking-tight transition-colors sm:block",
                    active ? "text-ink" : "text-ink-muted",
                    reachable && !active && "group-hover:text-ink",
                  )}
                >
                  {step.label}
                </span>
              </button>

              {index < ORDER_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-px min-w-3 flex-1 transition-colors",
                    done ? "bg-ink" : "bg-line-strong",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
