import { ProductVisual } from "@/components/brand/ProductVisual";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { resolvePricing } from "@/lib/config/pricing";
import { getActiveProducts } from "@/lib/data/products";
import { formatCurrency } from "@/lib/format";

interface ProductShowcaseProps {
  tone?: "canvas" | "deep" | "sand";
  limit?: number;
  withCta?: boolean;
}

/**
 * SØRKYST sells one product today, so a single product gets a full editorial
 * block rather than a lonely card in a grid. The grid takes over as soon as
 * there is more than one.
 */
export function ProductShowcase({ tone = "canvas", limit, withCta = true }: ProductShowcaseProps) {
  const products = getActiveProducts().slice(0, limit ?? undefined);
  const single = products.length === 1 ? products[0] : null;

  return (
    <Section id="produktene" tone={tone} spacing="lg" width="wide">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Produktet"
          title="Én vare. Den folk bruker opp."
          lead="Håndsåpe på refillpose — noe husholdninger kjøper likevel, og kjøper igjen."
        />
        {withCta ? (
          <ButtonLink href="/produktene" variant="secondary" className="shrink-0">
            Se produktet
          </ButtonLink>
        ) : null}
      </div>

      {single ? (
        <Reveal className="mt-12">
          <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <ProductVisual
              src={single.imageUrl}
              alt={`${single.name} fra SØRKYST`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              tone={single.placeholderTone}
              ratio={single.imageUrl ? "square" : "wide"}
              caption="SØRKYST"
              pair
            />

            <div className="flex flex-col gap-5">
              <h3 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
                {single.name}
              </h3>
              <p className="font-display text-xl text-ink-soft">{single.tagline}</p>
              <p className="max-w-prose text-base leading-relaxed text-ink-muted">
                {single.description}
              </p>

              <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
                {(() => {
                  const pricing = resolvePricing({ pricingId: single.pricingId });
                  return (
                    <>
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
                    </>
                  );
                })()}
              </dl>
            </div>
          </article>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => {
            const pricing = resolvePricing({ pricingId: product.pricingId });
            return (
              <Reveal key={product.id} delay={index * 70}>
                <article className="group flex h-full flex-col gap-5">
                  <ProductVisual
                    src={product.imageUrl}
                    alt={`${product.name} fra SØRKYST`}
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                    tone={product.placeholderTone}
                    ratio="portrait"
                    caption="SØRKYST"
                    className="transition-transform duration-500 group-hover:-translate-y-1"
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-xl leading-tight text-ink">{product.name}</h3>
                    <p className="text-sm leading-relaxed text-ink-muted">{product.tagline}</p>
                    <p className="tabular mt-2 text-sm text-ink">
                      {formatCurrency(pricing.consumerPrice)}
                      <span className="text-ink-faint">
                        {" "}
                        · {formatCurrency(pricing.organizationMargin)} til klubben
                      </span>
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
