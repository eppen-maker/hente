import type { ReactNode } from "react";
import { cn } from "./cn";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** "wide" for editorial full-bleed sections, "narrow" for reading columns. */
  width?: "narrow" | "default" | "wide";
}

const WIDTHS = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[88rem]",
} as const;

export function Container({ children, className, width = "default" }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", WIDTHS[width], className)}>
      {children}
    </div>
  );
}
