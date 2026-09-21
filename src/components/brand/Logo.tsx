import { cn } from "@/components/ui/cn";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "canvas";
  /** Adds the descriptor line used in the footer. */
  withDescriptor?: boolean;
}

const SIZES = {
  sm: "text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-4xl",
} as const;

/**
 * Text-based SØRKYST wordmark. Stands in until a drawn logotype exists;
 * the letterspacing is what carries it until then.
 */
export function Logo({ className, size = "md", tone = "ink", withDescriptor = false }: LogoProps) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-display tracking-[0.12em]",
          SIZES[size],
          tone === "ink" ? "text-ink" : "text-canvas",
        )}
      >
        SØRKYST
      </span>
      {withDescriptor ? (
        <span
          className={cn(
            "text-eyebrow mt-2",
            tone === "ink" ? "text-ink-faint" : "text-canvas/50",
          )}
        >
          Dugnad med innhold
        </span>
      ) : null}
    </span>
  );
}
