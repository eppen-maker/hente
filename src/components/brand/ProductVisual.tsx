import { cn } from "@/components/ui/cn";
import type { PlaceholderTone } from "@/types";

type Tone = PlaceholderTone;

const TONE_STYLES: Record<Tone, { field: string; body: string; cap: string; label: string }> = {
  sand: { field: "bg-sand", body: "bg-[#e7dccb]", cap: "bg-[#c9b79c]", label: "bg-canvas" },
  stone: { field: "bg-stone/60", body: "bg-[#ded6c8]", cap: "bg-[#bdb2a0]", label: "bg-canvas" },
  clay: { field: "bg-clay/50", body: "bg-[#e2cdb6]", cap: "bg-[#b99873]", label: "bg-canvas" },
  sage: { field: "bg-sage/45", body: "bg-[#d3d8cd]", cap: "bg-[#a3ac9b]", label: "bg-canvas" },
  ink: { field: "bg-ink", body: "bg-[#2a2822]", cap: "bg-[#4a463c]", label: "bg-canvas/90" },
};

interface ProductVisualProps {
  tone?: Tone;
  /** Aspect ratio of the frame. */
  ratio?: "portrait" | "square" | "wide";
  /** Wordmark printed on the bottle label. */
  caption?: string;
  className?: string;
  /** Renders a second, smaller bottle for a composed still life. */
  pair?: boolean;
}

const RATIOS = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  wide: "aspect-[16/10]",
} as const;

/**
 * Photography placeholder.
 *
 * A composed still-life stand-in — a silhouette on a warm field — so layouts
 * read correctly before real product photography is supplied. Swap the whole
 * component for an <Image> once assets land.
 */
export function ProductVisual({
  tone = "sand",
  ratio = "portrait",
  caption = "SØR°",
  className,
  pair = false,
}: ProductVisualProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-xl",
        RATIOS[ratio],
        styles.field,
        className,
      )}
    >
      {/* Light falling from the upper left, as in studio photography. */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-transparent to-black/[0.06]" />
      {/* Horizon line — a table edge. */}
      <div className="absolute inset-x-0 bottom-[18%] h-px bg-black/[0.07]" />

      <div className="absolute inset-0 flex items-end justify-center gap-[4%] pb-[18%]">
        {pair ? (
          <div className="flex h-[42%] w-[16%] flex-col items-center">
            <div className={cn("h-[10%] w-[38%] rounded-t-[2px]", styles.cap)} />
            <div className={cn("relative flex-1 w-full rounded-[3px]", styles.body)}>
              <div className="absolute inset-y-0 left-[14%] w-[10%] bg-white/25" />
            </div>
          </div>
        ) : null}

        <div className="flex h-[62%] w-[26%] flex-col items-center">
          {/* Pump */}
          <div className={cn("h-[6%] w-[52%] rounded-t-full", styles.cap)} />
          <div className={cn("h-[7%] w-[30%]", styles.cap)} />
          {/* Body */}
          <div className={cn("relative w-full flex-1 rounded-[4px]", styles.body)}>
            <div className="absolute inset-y-0 left-[12%] w-[12%] bg-white/30" />
            <div className="absolute inset-y-0 right-[10%] w-[6%] bg-black/[0.05]" />
            <div
              className={cn(
                "absolute inset-x-[14%] top-[30%] flex h-[26%] items-center justify-center rounded-[2px]",
                styles.label,
              )}
            >
              <span className="font-display text-[clamp(0.5rem,1.4vw,0.8rem)] tracking-[0.2em] text-ink">
                {caption}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Soft contact shadow */}
      <div className="absolute inset-x-[22%] bottom-[16%] h-3 rounded-[50%] bg-black/[0.08] blur-md" />
    </div>
  );
}
