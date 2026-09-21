import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { cn } from "@/components/ui/cn";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** Shared editorial header for inner pages. */
export function PageHero({ eyebrow, title, lead, children, align = "left", className }: PageHeroProps) {
  return (
    <section className={cn("border-b border-line bg-canvas-deep py-16 sm:py-24", className)}>
      <Container width="wide">
        <div
          className={cn(
            "flex flex-col gap-6",
            align === "center" ? "mx-auto max-w-3xl items-center text-center" : "max-w-4xl",
          )}
        >
          <span className="text-eyebrow text-ink-muted">{eyebrow}</span>
          <h1
            className="leading-[0.98] text-balance text-ink"
            style={{ fontSize: "clamp(2.25rem, 6vw, 4rem)" }}
          >
            {title}
          </h1>
          {lead ? (
            <p className="max-w-2xl text-lg leading-relaxed text-pretty text-ink-soft">{lead}</p>
          ) : null}
          {children}
        </div>
      </Container>
    </section>
  );
}
