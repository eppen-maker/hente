import { ArrowRight } from "lucide-react";

import { ProductVisual } from "@/components/brand/ProductVisual";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { formatCurrency } from "@/lib/format";
import { resolvePricing } from "@/lib/config/pricing";

export function Hero() {
  const pricing = resolvePricing();

  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-32">
      {/* Warm field behind the visual column */}
      <div
        aria-hidden
        className="absolute top-0 right-0 hidden h-full w-[42%] bg-canvas-deep lg:block"
      />

      <Container width="wide" className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="flex flex-col items-start gap-7">
            <Reveal>
              <span className="text-eyebrow inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-ink-muted">
                Dugnad for idrett og foreninger
              </span>
            </Reveal>

            <Reveal delay={60}>
              <h1
                className="max-w-[15ch] leading-[0.95] text-balance text-ink"
                style={{ fontSize: "clamp(2.75rem, 7.5vw, 5.25rem)" }}
              >
                En dugnad folk faktisk vil kjøpe.
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="max-w-lg text-lg leading-relaxed text-pretty text-ink-soft sm:text-xl">
                Premium hverdagsprodukter. Enkel dugnad. Mer igjen til klubben.
              </p>
            </Reveal>

            <Reveal delay={180} className="w-full">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/#kalkulator" size="lg" className="sm:w-auto" fullWidth>
                  Beregn deres fortjeneste
                  <ArrowRight className="size-4" strokeWidth={1.5} />
                </ButtonLink>
                <ButtonLink
                  href="/slik-fungerer-det"
                  variant="secondary"
                  size="lg"
                  className="sm:w-auto"
                  fullWidth
                >
                  Se hvordan det fungerer
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-7">
                <div>
                  <dt className="text-xs text-ink-faint">Utsalgspris</dt>
                  <dd className="tabular font-display text-xl text-ink">
                    {formatCurrency(pricing.consumerPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Til klubben per produkt</dt>
                  <dd className="tabular font-display text-xl text-ink">
                    {formatCurrency(pricing.organizationMargin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Oppstart</dt>
                  <dd className="font-display text-xl text-ink">2 uker</dd>
                </div>
              </dl>
            </Reveal>
          </div>

          {/* Product visual area — placeholders until photography is supplied */}
          <Reveal delay={120} className="lg:pl-6">
            <div className="grid grid-cols-5 grid-rows-6 gap-3 sm:gap-4">
              <div className="col-span-3 row-span-6">
                <ProductVisual tone="sand" ratio="portrait" caption="SØR°" className="h-full" pair />
              </div>
              <div className="col-span-2 row-span-3">
                <ProductVisual tone="sage" ratio="square" caption="REFILL" className="h-full" />
              </div>
              <div className="col-span-2 row-span-3">
                <ProductVisual tone="clay" ratio="square" caption="NO. 01" className="h-full" />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
