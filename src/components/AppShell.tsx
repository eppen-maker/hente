import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/cn";
import type { SessionUser } from "@/lib/auth/session";

export interface NavItem {
  href: string;
  label: string;
}

/** Shared chrome for every authenticated area. */
export function AppShell({
  user,
  nav,
  active,
  title,
  subtitle,
  actions,
  children,
  width = "wide",
}: {
  user: SessionUser;
  nav: NavItem[];
  active?: string;
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-navy-100 bg-white">
        <div className={cn("mx-auto flex items-center justify-between gap-6 px-5 py-4", width === "wide" ? "max-w-7xl" : "max-w-3xl")}>
          <div className="flex items-center gap-8">
            <Logo size="sm" />
            <nav className="hidden gap-6 md:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition",
                    active === item.href ? "font-medium text-navy-900" : "text-navy-400 hover:text-navy-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-navy-400 sm:inline">
              {user.profile.first_name} {user.profile.last_name}
            </span>
            <SignOutButton />
          </div>
        </div>
        {nav.length > 1 ? (
          <nav className="flex gap-5 overflow-x-auto border-t border-navy-100 px-5 py-2.5 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("whitespace-nowrap text-sm", active === item.href ? "font-medium text-navy-900" : "text-navy-400")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className={cn("mx-auto px-5 py-8", width === "wide" ? "max-w-7xl" : "max-w-3xl")}>
        {title ? (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display text-3xl text-navy-900 sm:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-navy-400">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
