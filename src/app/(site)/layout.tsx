import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Public site chrome. The admin area lives outside this group, so it does not
 * inherit the marketing header and footer.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#innhold"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas"
      >
        Hopp til innhold
      </a>
      <SiteHeader />
      <main id="innhold" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
