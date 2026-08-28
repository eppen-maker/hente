import type { ReactNode } from "react";
import { cn } from "./cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "sand" | "ink" | "outline";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const TONES = {
  surface: "bg-surface border border-line shadow-soft",
  sand: "bg-sand border border-line",
  outline: "bg-transparent border border-line-strong",
  ink: "bg-ink text-canvas border border-ink",
} as const;

const PADDING = {
  none: "",
  sm: "p-5",
  md: "p-6 sm:p-8",
  lg: "p-7 sm:p-10",
} as const;

export function Card({
  children,
  className,
  tone = "surface",
  padding = "md",
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        TONES[tone],
        PADDING[padding],
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}
