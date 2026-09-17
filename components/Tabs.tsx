"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ base, items }: { base: string; items: { slug: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 border-b border-[color:var(--line)] mb-7 overflow-x-auto">
      {items.map((t) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={t.slug}
            href={href}
            className={`px-3 py-2.5 text-[12.5px] border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active ? "border-[color:var(--accent)] text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
