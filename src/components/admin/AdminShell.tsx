"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/components/ui/cn";

const NAV = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard, exact: true },
  { href: "/admin/dugnader", label: "Dugnader", icon: ClipboardList },
  { href: "/admin/organisasjoner", label: "Organisasjoner", icon: Building2 },
  { href: "/admin/bestillinger", label: "Bestillinger", icon: Boxes },
  { href: "/admin/produkter", label: "Produkter", icon: Tag },
  { href: "/admin/priser", label: "Priser", icon: Tag },
  { href: "/admin/leveranser", label: "Leveranser", icon: Truck },
  { href: "/admin/rapporter", label: "Rapporter", icon: BarChart3 },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: Settings },
] as const;

interface AdminShellProps {
  children: ReactNode;
  actor: string;
  authenticated: boolean;
  localStore: boolean;
}

export function AdminShell({ children, actor, authenticated, localStore }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="Adminmeny" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(item.href, "exact" in item ? item.exact : false);
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-ink text-canvas"
                : "text-ink-muted hover:bg-sand hover:text-ink",
            )}
          >
            <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-canvas-deep">
      {/* Access warning: this area has no authentication yet. */}
      {!authenticated ? (
        <p className="bg-[#7a3a26] px-4 py-2 text-center text-xs text-canvas">
          Adminområdet er uten innlogging. Ikke publiser det før autentisering er på plass.
        </p>
      ) : null}

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-line bg-canvas lg:block">
          <div className="sticky top-0 flex h-dvh flex-col justify-between overflow-y-auto p-5">
            <div className="flex flex-col gap-8">
            <Link href="/admin" className="px-3 pt-2">
              <Logo size="sm" />
              <span className="text-eyebrow mt-2 block text-ink-faint">Admin</span>
            </Link>
              {nav}
            </div>
            <div className="flex flex-col gap-2 border-t border-line px-3 pt-4">
              <span className="text-xs text-ink-faint">Innlogget som</span>
              <span className="text-sm text-ink">{actor}</span>
              <Link
                href="/"
                className="mt-2 text-xs text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
              >
                Til nettsiden
              </Link>
              {authenticated ? (
                <form action="/admin/logg-ut" method="post">
                  <button
                    type="submit"
                    className="text-xs text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
                  >
                    Logg ut
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Mobile bar */}
        <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-3 lg:hidden">
          <Link href="/admin" className="flex items-baseline gap-2">
            <Logo size="sm" />
            <span className="text-eyebrow text-ink-faint">Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Lukk meny" : "Åpne meny"}
            className="grid size-9 place-items-center rounded-md text-ink hover:bg-sand"
          >
            {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
          </button>
        </div>

        {open ? (
          <div className="animate-fade border-b border-line bg-canvas px-4 py-4 lg:hidden">{nav}</div>
        ) : null}

        <main className="min-w-0 px-4 py-8 sm:px-8 sm:py-10">
          {localStore ? (
            <p className="mb-6 rounded-lg border border-line bg-sand px-4 py-3 text-xs leading-relaxed text-ink-muted">
              Kjører på lokal lagring i <code className="text-ink">.data/</code>. Endringer
              lagres på disk og vises umiddelbart på de offentlige dugnadssidene. Slett
              mappen for å tilbakestille til demodata.
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
