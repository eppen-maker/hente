import Link from "next/link";
import { brand } from "@/brand/brand.config";
import { cn } from "@/lib/cn";

/** Text logo placeholder. Swap `brand.logoSrc` to use an image asset instead. */
export function Logo({ className, size = "md", href = "/" }: { className?: string; size?: "sm" | "md" | "lg"; href?: string | null }) {
  const sizes = {
    sm: "text-sm tracking-[0.28em]",
    md: "text-base tracking-[0.3em]",
    lg: "text-xl tracking-[0.32em]",
  } as const;

  const content = brand.logoSrc ? (
    <img src={brand.logoSrc} alt={brand.logoAlt} className={cn("h-7 w-auto", className)} />
  ) : (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("font-semibold text-navy-900", sizes[size])}>{brand.name}</span>
      <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-navy-300">{brand.established}</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-block">
      {content}
    </Link>
  );
}
