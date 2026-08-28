"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/components/ui/cn";
import { ACCOUNT_NAV, PRIMARY_CTA, PRIMARY_NAV } from "@/lib/config/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock background scroll while the mobile panel is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || open
          ? "border-b border-line bg-canvas/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container width="wide">
        <div className="flex h-16 items-center justify-between gap-6 sm:h-20">
          <Link href="/" aria-label="SØR° forsiden" className="shrink-0">
            <Logo size="md" />
          </Link>

          <nav aria-label="Hovedmeny" className="hidden items-center gap-8 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-1 text-sm tracking-tight transition-colors",
                  pathname === item.href ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-ink transition-transform duration-300",
                    pathname === item.href ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={ACCOUNT_NAV.href}
              className="text-sm tracking-tight text-ink-muted transition-colors hover:text-ink"
            >
              {ACCOUNT_NAV.label}
            </Link>
            <ButtonLink href={PRIMARY_CTA.href} size="sm">
              {PRIMARY_CTA.label}
            </ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Lukk meny" : "Åpne meny"}
            className="-mr-2 grid size-10 place-items-center rounded-md text-ink transition-colors hover:bg-sand lg:hidden"
          >
            {open ? (
              <X className="size-5" strokeWidth={1.5} />
            ) : (
              <Menu className="size-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </Container>

      {open ? (
        <div
          id="mobile-menu"
          // `backdrop-filter` on the header makes it a containing block, so the
          // panel is positioned against the header rather than the viewport.
          className="animate-fade absolute inset-x-0 top-full z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-canvas sm:h-[calc(100dvh-5rem)] lg:hidden"
        >
          <Container className="flex min-h-full flex-col justify-between py-8">
            <nav aria-label="Mobilmeny" className="flex flex-col">
              {[...PRIMARY_NAV, ACCOUNT_NAV].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line py-5 font-display text-2xl text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="pt-10">
              <ButtonLink
                href={PRIMARY_CTA.href}
                size="lg"
                fullWidth
                onClick={() => setOpen(false)}
              >
                {PRIMARY_CTA.label}
              </ButtonLink>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
