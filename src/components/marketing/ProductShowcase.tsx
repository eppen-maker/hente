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

export function ProductShowcase({ tone = "canvas", limit, withCta = true }: ProductShowcaseProps) {
  const products = getActiveProducts().slice(0, limit ?? undefined);

  return (
    <Section id="produktene" tone={tone} spacing="lg" width="wide">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Produktene"
          title="Refill til hjemmet, laget for å stå fremme."
          lead="Tunge flasker, rene etiketter og duft folk faktisk liker. Alt selges til samme pris."
        />
        {withCta ? (
          <ButtonLink href="/produktene" variant="secondary" className="shrink-0">
            Se hele sortimentet
          </ButtonLink>
        ) : null}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => {
          const pricing = resolvePricing({ pricingId: product.pricingId });
          return (
            <Reveal key={product.id} delay={index * 70}>
              <article className="group flex h-full flex-col gap-5">
                <ProductVisual
                  tone={product.placeholderTone}
                  ratio="portrait"
                  caption="SØR°"
                  className="transition-transform duration-500 group-hover:-translate-y-1"
                />
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-xl leading-tight text-ink">{product.name}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{product.tagline}</p>
                  <p className="tabular mt-2 text-sm text-ink">
                    {formatCurrency(pricing.consumerPrice)}
                    <span className="text-ink-faint"> · {formatCurrency(pricing.organizationMargin)} til klubben</span>
                  </p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
