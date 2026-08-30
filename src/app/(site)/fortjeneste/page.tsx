import type { Metadata } from "next";

import { ProfitChart } from "@/components/charts/ProfitChart";
import { CalculatorSection } from "@/components/marketing/CalculatorSection";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { EconomicsExample } from "@/components/marketing/EconomicsExample";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/components/ui/cn";
import { projectFromProductsPerParticipant } from "@/lib/calc/fundraising";
import { CALCULATOR_DEFAULTS, SHOWCASE_EXAMPLE, resolvePricing } from "@/lib/config/pricing";
import { formatCurrency, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fortjeneste",
  description:
    "Se hva organisasjonen sitter igjen med. Faste priser, fast margin per produkt og ferdige scenarier.",
};

const PARTICIPANT_SCENARIOS = [100, 250, 600, 1000];
const EFFORT_SCENARIOS = [5, 10, 15];

export default function ProfitPage() {
  const pricing = resolvePricing();

  return (
    <>
      <PageHero
        eyebrow="Fortjeneste"
        title="Fast margin på hvert eneste produkt."
        lead={`Organisasjonen kjøper inn til ${formatCurrency(
          pricing.organizationPrice,
        )} og selger videre til ${formatCurrency(
          pricing.consumerPrice,
        )}. ${formatCurrency(pricing.organizationMargin)} går rett til klubbkassen.`}
      />

      <EconomicsExample tone="canvas" />

      <Section tone="deep" spacing="lg" width="wide">
        <SectionHeading
          eyebrow="Scenarier"
          title="Fortjeneste etter størrelse og innsats."
          lead="Tallene under viser hva organisasjonen sitter igjen med, avhengig av hvor mange som selger og hvor mye hver selger."
        />

        <Reveal className="mt-12">
          <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">
                Fortjeneste etter antall deltakere og produkter per deltaker
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="text-eyebrow px-6 py-5 text-ink-faint">
                    Deltakere
                  </th>
                  {EFFORT_SCENARIOS.map((effort) => (
                    <th
                      key={effort}
                      scope="col"
                      className="text-eyebrow px-6 py-5 text-right text-ink-faint"
                    >
                      {formatNumber(effort)} per deltaker
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARTICIPANT_SCENARIOS.map((participants) => (
                  <tr key={participants} className="border-b border-line last:border-b-0">
                    <th
                      scope="row"
                      className="px-6 py-6 font-display text-xl font-normal text-ink"
                    >
                      {formatNumber(participants)}
                    </th>
                    {EFFORT_SCENARIOS.map((effort) => {
                      const projection = projectFromProductsPerParticipant({
                        participants,
                        productsPerParticipant: effort,
                      });
                      const isReference =
                        participants === SHOWCASE_EXAMPLE.participants &&
                        effort === SHOWCASE_EXAMPLE.productsPerParticipant;

                      return (
                        <td
                          key={effort}
                          className={cn(
                            "tabular px-6 py-6 text-right font-display text-xl",
                            isReference ? "bg-sand text-ink" : "text-ink-soft",
                          )}
                        >
                          {formatCurrency(projection.organizationProfit)}
                          <span className="mt-1 block text-xs text-ink-faint">
                            {formatNumber(projection.totalProducts)} produkter
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      <Section tone="canvas" spacing="lg" width="wide">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Volum"
            title="Større bestilling, større kasse."
            lead={`Grafen viser fortjenesten ved vanlige volum, beregnet for ${formatNumber(
              SHOWCASE_EXAMPLE.participants,
            )} deltakere. Dere er aldri bundet til disse antallene.`}
          />
          <Reveal delay={80}>
            <div className="rounded-xl border border-line bg-surface p-5 shadow-soft sm:p-7">
              <ProfitChart
                volumes={CALCULATOR_DEFAULTS.quickVolumes}
                participants={SHOWCASE_EXAMPLE.participants}
                highlight={
                  SHOWCASE_EXAMPLE.participants * SHOWCASE_EXAMPLE.productsPerParticipant
                }
              />
            </div>
          </Reveal>
        </div>
      </Section>

      <CalculatorSection
        tone="deep"
        eyebrow="Kalkulator"
        title="Regn på deres egne tall."
        lead="Bytt mellom innsats per deltaker og et konkret fortjenestemål."
      />

      <ClosingCta />
    </>
  );
}
