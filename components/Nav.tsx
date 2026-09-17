"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const GROUPS: { label: string; items: { href: string; name: string }[] }[] = [
  {
    label: "Portfolio",
    items: [
      { href: "/", name: "Dashboard" },
      { href: "/companies", name: "Companies" },
      { href: "/investors", name: "Investors" },
      { href: "/capital", name: "Capital deployment" },
    ],
  },
  {
    label: "Decision tools",
    items: [
      { href: "/allocate", name: "Allocate investment" },
      { href: "/sizing", name: "How much to invest" },
      { href: "/scenario-lab", name: "Portfolio scenario lab" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/updates", name: "Updates & alerts" },
      { href: "/memos", name: "Investment memos" },
      { href: "/data", name: "Data sources & quality" },
    ],
  },
];

export function Nav({ fundName, vehicleName }: { fundName: string; vehicleName: string }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem("hente-theme") as "light" | "dark") ?? "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("hente-theme", next);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-[232px] shrink-0 border-r border-[color:var(--line)] h-screen sticky top-0 flex flex-col bg-[color:var(--surface)]">
      <div className="px-5 py-6 border-b border-[color:var(--line)]">
        <div className="text-[14px] font-semibold tracking-[-0.01em]">{fundName}</div>
        <div className="text-[10.5px] text-ink-3 mt-1 tracking-[0.06em] uppercase">Investment Intelligence</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="label px-5 mb-2">{g.label}</div>
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-5 py-[7px] text-[12.5px] border-l-2 transition-colors ${
                  isActive(item.href)
                    ? "border-[color:var(--accent)] text-ink bg-[color:var(--surface-2)]"
                    : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[color:var(--line)] flex items-center justify-between">
        <div className="text-[10.5px] text-ink-3 leading-tight">
          {vehicleName}
          <br />
          Base currency NOK
        </div>
        <button
          onClick={toggle}
          className="text-[10.5px] text-ink-3 border border-[color:var(--line-strong)] rounded-[3px] px-2 py-1 hover:text-ink"
          aria-label="Toggle theme"
        >
          {theme === "light" ? "Dark" : "Light"}
        </button>
      </div>
    </aside>
  );
}
