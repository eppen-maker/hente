import { NotFoundContent } from "@/components/marketing/NotFoundContent";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Global fallback for routes outside the site group. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
