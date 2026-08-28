import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/components/ui/cn";
import { projectFromProductsPerParticipant } from "@/lib/calc/fundraising";
import { SHOWCASE_EXAMPLE } from "@/lib/config/pricing";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

interface StepProps {
  label: string;
  value: string;
  operator?: string;
}

function FlowStep({ label, value, operator }: StepProps) {
  return (
    <div className="flex items-center gap-5 sm:gap-7">
      {operator ? (
        <span aria-hidden className="font-display text-2xl text-ink-faint sm:text-3xl">
          {operator}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow text-ink-faint">{label}</span>
        <span className="tabular font-display text-2xl leading-none text-ink sm:text-3xl">
          {value}
        </span>
      </div>
    </div>
  );
}

export function EconomicsExample({ tone = "sand" }: { tone?: "sand" | "canvas" | "deep" }) {
  const projection = projectFromProductsPerParticipant({
    participants: SHOWCASE_EXAMPLE.participants,
    productsPerParticipant: SHOWCASE_EXAMPLE.productsPerParticipant,
  });

  const { pricing } = projection;
  const purchaseShare = pricing.organizationPrice / pricing.consumerPrice;

  return (
    <Section id="fortjeneste" tone={tone} spacing="lg" width="wide">
      <SectionHeading
        eyebrow="Fortjeneste"
        title={`Et vanlig lag med ${formatNumber(
          SHOWCASE_EXAMPLE.participants,
        )} deltakere.`}
        lead={`${formatNumber(
          SHOWCASE_EXAMPLE.productsPerParticipant,
        )} produkter hver. Det er hele innsatsen som skal til.`}
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        {/* The number that matters */}
        <Reveal>
          <div className="flex h-full flex-col justify-between gap-10 rounded-xl bg-ink p-8 text-canvas sm:p-12">
            <div>
              <span className="text-eyebrow text-canvas/55">Til klubben</span>
              <p
                className="tabular mt-5 font-display leading-[0.9]"
                style={{ fontSize: "clamp(3rem, 9vw, 5.5rem)" }}
              >
                {formatCurrency(projection.organizationProfit)}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-5 border-t border-canvas/15 pt-8">
              <div>
                <p className="text-xs text-canvas/50">Produkter</p>
                <p className="tabular font-display text-xl">
                  {formatNumber(projection.totalProducts)}
                </p>
              </div>
              <div>
                <p className="text-xs text-canvas/50">Totalt salg</p>
                <p className="tabular font-display text-xl">
                  {formatCurrency(projection.totalConsumerSales)}
                </p>
              </div>
              <div>
                <p className="text-xs text-canvas/50">Andel til klubben</p>
                <p className="tabular font-display text-xl">
                  {formatPercent(pricing.marginRate)}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* How the number is built */}
        <Reveal delay={90}>
          <div className="flex h-full flex-col gap-10 rounded-xl border border-line bg-surface p-8 sm:p-10">
            <div className="flex flex-col gap-6">
              <FlowStep
                label="Deltakere"
                value={formatNumber(projection.participants)}
              />
              <FlowStep
                label="Produkter hver"
                value={formatNumber(projection.productsPerParticipant)}
                operator="×"
              />
              <FlowStep
                label="Fortjeneste per produkt"
                value={formatCurrency(pricing.organizationMargin)}
                operator="×"
              />
              <div className="flex items-center gap-5 border-t border-line pt-6 sm:gap-7">
                <span aria-hidden className="font-display text-2xl text-ink-faint sm:text-3xl">
                  =
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-eyebrow text-ink-faint">Til klubben</span>
                  <span className="tabular font-display text-3xl leading-none text-ink sm:text-4xl">
                    {formatCurrency(projection.organizationProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Where each krone from a single sale goes */}
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-muted">Én pris på {formatCurrency(pricing.consumerPrice)}</span>
                <span className="tabular text-ink-faint">
                  {formatCurrency(pricing.organizationPrice)} inn · {formatCurrency(pricing.organizationMargin)} igjen
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-stone">
                <div
                  className={cn("h-full bg-clay")}
                  style={{ width: `${purchaseShare * 100}%` }}
                />
                <div className="h-full flex-1 bg-ink" />
              </div>
              <div className="flex justify-between text-xs text-ink-muted">
                <span>Klubbens innkjøpspris</span>
                <span>Klubbens fortjeneste</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
