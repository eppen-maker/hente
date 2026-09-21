import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { COMPANY, FOOTER_NAV } from "@/lib/config/navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas-deep">
      <Container width="wide" className="py-14 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-5">
            <Logo size="lg" withDescriptor />
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
              Premium hverdagsprodukter til dugnad. Laget for organisasjoner som
              vil selge noe folk faktisk bruker.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <div key={group.title} className="flex flex-col gap-4">
              <h3 className="text-eyebrow text-ink-faint">{group.title}</h3>
              <ul className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {COMPANY.name}. Alle rettigheter reservert.
          </p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={`mailto:${COMPANY.email}`} className="transition-colors hover:text-ink">
              {COMPANY.email}
            </a>
            <span>{COMPANY.city}</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
