import Image from "next/image";

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
  /**
   * Real product photography. When present it replaces the placeholder
   * entirely — the frame, ratio and rounding stay the same, so a layout does
   * not shift when a photo lands.
   */
  src?: string | null;
  /** Describes the photo. Ignored by the placeholder, which is decorative. */
  alt?: string;
  /** Above-the-fold photography should not lazy-load. */
  priority?: boolean;
  /** Passed to next/image so the browser picks a sensibly sized file. */
  sizes?: string;
  tone?: Tone;
  /** Aspect ratio of the frame. */
  ratio?: "portrait" | "square" | "wide";
  /** Wordmark printed on the placeholder label. */
  caption?: string;
  className?: string;
  /** Placeholder only: draws a second, smaller bottle for a still life. */
  pair?: boolean;
}

const RATIOS = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  wide: "aspect-[16/10]",
} as const;

/**
 * The product image slot.
 *
 * Given a `src` it renders the photograph. Given none it draws a composed
 * still-life stand-in — a silhouette on a warm field — so a layout reads
 * correctly before photography exists. Both fill the same frame, so a page
 * looks the same shape either way.
 */
export function ProductVisual({
  src,
  alt = "",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  tone = "sand",
  ratio = "portrait",
  caption = "SØRKYST",
  className,
  pair = false,
}: ProductVisualProps) {
  const styles = TONE_STYLES[tone];

  if (src) {
    return (
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-xl bg-photo",
          RATIOS[ratio],
          className,
        )}
      >
        {/* `contain`, not `cover`: a product shot must never be cropped. The
            frame is `bg-photo`, the same ground the photography is shot on, so
            the bars a contained fit leaves are invisible at any ratio. */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain"
        />
      </div>
    );
  }

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
              <span className="font-display text-[clamp(0.4rem,1.05vw,0.65rem)] tracking-[0.08em] whitespace-nowrap text-ink">
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
