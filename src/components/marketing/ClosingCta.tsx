import { ArrowRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { projectFromProductsPerParticipant } from "@/lib/calc/fundraising";
import { SHOWCASE_EXAMPLE } from "@/lib/config/pricing";
import { formatCurrency, formatNumber } from "@/lib/format";

export function ClosingCta() {
  const projection = projectFromProductsPerParticipant({
    participants: SHOWCASE_EXAMPLE.participants,
    productsPerParticipant: SHOWCASE_EXAMPLE.productsPerParticipant,
  });

  return (
    <section className="bg-ink py-24 text-canvas sm:py-32">
      <Container width="wide">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <Reveal>
            <div className="flex flex-col gap-6">
              <span className="text-eyebrow text-canvas/50">Kom i gang</span>
              <h2
                className="max-w-[14ch] leading-[0.95] text-balance"
                style={{ fontSize: "clamp(2.5rem, 7vw, 4.75rem)" }}
              >
                Hvor mye kan dere tjene?
              </h2>
              <p className="max-w-md text-base leading-relaxed text-canvas/70 sm:text-lg">
                {formatNumber(projection.participants)} deltakere som selger{" "}
                {formatNumber(projection.productsPerParticipant)} produkter hver gir{" "}
                {formatCurrency(projection.organizationProfit)} til klubben. Sett inn
                deres egne tall — vi svarer innen én virkedag.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <ButtonLink href="/bestill" variant="inverse" size="lg">
                Bestill dugnad
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </ButtonLink>
              <ButtonLink
                href="/start-dugnad"
                size="lg"
                className="border border-canvas/25 bg-transparent text-canvas hover:bg-canvas/10 hover:shadow-none"
              >
                Spør oss først
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
