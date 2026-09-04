import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/brand/brand.config";
import { Logo } from "@/components/ui/Logo";
import { formatOre } from "@/lib/money";
import { getPublicSellerPage } from "@/lib/data/public";
import { CheckoutForm } from "./CheckoutForm";

interface Params {
  params: Promise<{ club: string; team: string; seller: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { club, team, seller } = await params;
  const page = await getPublicSellerPage(club, team, seller);
  if (!page) return { title: "Fant ikke siden" };
  return {
    title: `Støtt ${page.team.name}`,
    description: `${page.seller.first_name} ${page.seller.last_name} samler inn penger til ${page.team.name}.`,
  };
}

export default async function SellerSalesPage({ params }: Params) {
  const { club, team, seller } = await params;
  const page = await getPublicSellerPage(club, team, seller);
  if (!page) notFound();

  const sellerName = `${page.seller.first_name} ${page.seller.last_name}`.trim();
  const closed = page.campaign.status !== "ACTIVE" || !page.seller.active;

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-navy-100 bg-white px-5 py-5">
        <div className="mx-auto max-w-lg">
          <Logo size="sm" href={null} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-20 pt-10">
        <p className="label">{page.club.name}</p>
        <h1 className="display mt-3 text-4xl leading-tight text-navy-900">Støtt {page.team.name}</h1>
        <p className="mt-3 text-lg text-navy-500">{sellerName} samler inn penger til laget</p>

        <section className="card mt-8 overflow-hidden">
          <div className="flex aspect-[4/3] items-center justify-center border-b border-navy-100 bg-sand-200">
            {brand.product.imageSrc ? (
              <img src={brand.product.imageSrc} alt={brand.product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="text-center">
                <p className="display text-lg tracking-[0.3em] text-navy-900">{brand.name}</p>
                <p className="mt-2 text-sm text-navy-400">{brand.product.volume} refill</p>
              </div>
            )}
          </div>

          <div className="px-5 py-5">
            <h2 className="font-semibold text-navy-900">{brand.product.name}</h2>
            <p className="mt-1 text-sm text-navy-400">{brand.product.volume}</p>
            <p className="display tabular mt-3 text-2xl">{formatOre(page.campaign.retail_price_inc_vat)}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-navy-500">
              {brand.product.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden className="text-navy-300">
                    —
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-navy-100 pt-4 text-sm font-medium text-navy-900">
              {formatOre(page.campaign.club_earning_per_unit)} per pose går til laget
            </p>
          </div>
        </section>

        {closed ? (
          <div className="card mt-8 border-amber-200 bg-amber-50 px-5 py-6 text-center">
            <p className="font-semibold text-amber-900">Dugnaden er avsluttet</p>
            <p className="mt-2 text-sm text-amber-800">
              Det er ikke lenger mulig å bestille via denne lenken. Takk til alle som støttet {page.team.name}!
            </p>
          </div>
        ) : (
          <CheckoutForm
            clubSlug={page.club.slug}
            teamSlug={page.team.slug}
            sellerSlug={page.seller.slug}
            unitPriceOre={page.campaign.retail_price_inc_vat}
            clubEarningOre={page.campaign.club_earning_per_unit}
            paymentMode={page.campaign.payment_mode}
            clubName={page.club.name}
          />
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-navy-300">
          {page.campaign.payment_mode === "INVOICE"
            ? `Bestillingen registreres nå, og ${page.club.name} sender deg betalingsinformasjon.`
            : `Betaling skjer til ${brand.name}.`}{" "}
          Varene leveres av {page.seller.first_name} når dugnaden er ferdig
          {page.campaign.end_date ? ` (${new Date(page.campaign.end_date).toLocaleDateString("nb-NO")})` : ""}.
        </p>
      </main>
    </div>
  );
}
