import type { Metadata } from "next";

import { ProductVisual } from "@/components/brand/ProductVisual";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { resolvePricing } from "@/lib/config/pricing";
import { getActiveProducts } from "@/lib/data/products";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = {
  title: "Produktene",
  description:
    "Håndsåpe på refillflaske. Et premium hverdagsprodukt som selges gjennom dugnad.",
};

export default function ProductsPage() {
  const products = getActiveProducts();

  return (
    <>
      <PageHero
        eyebrow="Produktet"
        title="Et hverdagsprodukt med samme omtanke som en parfyme."
        lead="Håndsåpe på refillflaske. Én fast pris, så regnestykket for dugnaden blir enkelt."
      />

      <Section tone="canvas" spacing="lg" width="wide">
        <div className="flex flex-col gap-20 sm:gap-28">
          {products.map((product, index) => {
            const pricing = resolvePricing({ pricingId: product.pricingId });
            const reversed = index % 2 === 1;

            return (
              <Reveal key={product.id}>
                <article
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                    reversed ? "lg:[&>figure]:order-2" : ""
                  }`}
                >
                  <figure className="m-0">
                    <ProductVisual
                      tone={product.placeholderTone}
                      ratio="wide"
                      caption="SØRKYST"
                      pair={index === 0}
                    />
                  </figure>

                  <div className="flex flex-col gap-5">
                    <span className="text-eyebrow text-ink-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
                      {product.name}
                    </h2>
                    <p className="font-display text-xl text-ink-soft">{product.tagline}</p>
                    <p className="max-w-prose text-base leading-relaxed text-ink-muted">
                      {product.description}
                    </p>

                    {product.ingredientsHighlight?.length ? (
                      <ul className="flex flex-wrap gap-2 pt-1">
                        {product.ingredientsHighlight.map((item) => (
                          <li
                            key={item}
                            className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-muted"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
                      <div>
                        <dt className="text-xs text-ink-faint">Utsalgspris</dt>
                        <dd className="tabular font-display text-xl text-ink">
                          {formatCurrency(pricing.consumerPrice)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-faint">Klubbens innkjøp</dt>
                        <dd className="tabular font-display text-xl text-ink">
                          {formatCurrency(pricing.organizationPrice)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-faint">Til klubben</dt>
                        <dd className="tabular font-display text-xl text-ink">
                          {formatCurrency(pricing.organizationMargin)}
                        </dd>
                      </div>
                    </dl>

                    {product.variants.length > 0 ? (
                      <p className="text-sm text-ink-faint">
                        Varianter:{" "}
                        {product.variants
                          .map((variant) => `${variant.name} (${variant.size})`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section tone="sand" spacing="md" width="default">
        <SectionHeading
          align="center"
          eyebrow="Produktfoto"
          title="Bildene kommer."
          lead="Illustrasjonene over er plassholdere. Layouten er klar for ekte produktfotografi uten flere endringer i koden."
          className="mx-auto"
        />
      </Section>

      <ClosingCta />
    </>
  );
}
