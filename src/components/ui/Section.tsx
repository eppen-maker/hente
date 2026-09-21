import type { ReactNode } from "react";
import { Container } from "./Container";
import { cn } from "./cn";

interface SectionProps {
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  width?: "narrow" | "default" | "wide";
  tone?: "canvas" | "deep" | "sand" | "ink" | "surface";
  /** Vertical rhythm. */
  spacing?: "sm" | "md" | "lg";
}

const TONES = {
  canvas: "bg-canvas text-ink",
  deep: "bg-canvas-deep text-ink",
  sand: "bg-sand text-ink",
  surface: "bg-surface text-ink",
  ink: "bg-ink text-canvas",
} as const;

const SPACING = {
  sm: "py-14 sm:py-20",
  md: "py-20 sm:py-28",
  lg: "py-24 sm:py-36",
} as const;

export function Section({
  children,
  id,
  className,
  containerClassName,
  width = "default",
  tone = "canvas",
  spacing = "md",
}: SectionProps) {
  return (
    <section id={id} className={cn(TONES[tone], SPACING[spacing], "scroll-mt-20", className)}>
      <Container width={width} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  tone?: "ink" | "canvas";
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  tone = "ink",
}: SectionHeadingProps) {
  const muted = tone === "ink" ? "text-ink-muted" : "text-canvas/65";
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? <span className={cn("text-eyebrow", muted)}>{eyebrow}</span> : null}
      <h2 className="max-w-3xl text-3xl leading-[1.08] text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {lead ? (
        <p className={cn("max-w-2xl text-base leading-relaxed text-pretty sm:text-lg", muted)}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
