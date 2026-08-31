import type { Metadata } from "next";
import { CalendarDays, ClipboardList, PackageCheck, Truck } from "lucide-react";

import { CalculatorSection } from "@/components/marketing/CalculatorSection";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { resolvePricing } from "@/lib/config/pricing";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = {
  title: "Slik fungerer det",
  description:
    "Fra første samtale til utdelte produkter: slik gjennomfører organisasjonen en dugnad med SØRKYST.",
};

const TIMELINE = [
  {
    icon: ClipboardList,
    week: "Uke 1",
    title: "Avtale og mål",
    body: "Vi går gjennom antall deltakere, mål for dugnaden og fordeling per deltaker. Dere får et fast tilbud.",
  },
  {
    icon: CalendarDays,
    week: "Uke 2",
    title: "Forberedelse",
    body: "Dere får salgsmateriell, bestillingslister og en tydelig oversikt over hvem som selger hva.",
  },
  {
    icon: Truck,
    week: "Uke 3–4",
    title: "Salg og levering",
    body: "Medlemmene selger. Vi leverer samlet til ett sted, ferdig sortert per lag eller gruppe.",
  },
  {
    icon: PackageCheck,
    week: "Etter dugnaden",
    title: "Oppgjør",
    body: "Organisasjonen betaler innkjøpsprisen og beholder resten. Én faktura, ingen etterarbeid.",
  },
];

export default function HowItWorksPage() {
  const pricing = resolvePricing();

  return (
    <>
      <PageHero
        eyebrow="Slik fungerer det"
        title="En dugnad som er ferdig planlagt før den starter."
        lead="Organisasjonen kjøper inn til fast pris og selger videre til veiledende utsalgspris. Differansen beholder dere."
      />

      <HowItWorks tone="canvas" />

      <Section tone="deep" spacing="lg" width="wide">
        <SectionHeading
          eyebrow="Tidslinje"
          title="Fra første samtale til ferdig oppgjør."
          lead="De fleste dugnader gjennomføres på fire uker."
        />
        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIMELINE.map((item, index) => (
            <Reveal key={item.week} delay={index * 80}>
              <li className="flex h-full flex-col gap-5 rounded-xl border border-line bg-canvas p-7">
                <item.icon className="size-5 text-ink-muted" strokeWidth={1.25} />
                <div className="flex flex-col gap-2">
                  <span className="text-eyebrow text-ink-faint">{item.week}</span>
                  <h3 className="font-display text-xl leading-tight text-ink">{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section tone="sand" spacing="lg" width="wide">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="Vilkårene"
            title="Enkle betingelser, uten overraskelser."
          />
          <dl className="flex flex-col divide-y divide-line-strong border-t border-line-strong">
            {[
              ["Veiledende utsalgspris", formatCurrency(pricing.consumerPrice)],
              ["Klubbens innkjøpspris", `${formatCurrency(pricing.organizationPrice)} inkl. mva.`],
              ["Fortjeneste per produkt", formatCurrency(pricing.organizationMargin)],
              ["Betaling", "Faktura med 30 dagers forfall"],
              ["Levering", "Samlet til én adresse, sortert per lag"],
              ["Retur", "Ubrutte kartonger kan returneres etter avtale"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 py-5">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="tabular text-right font-display text-lg text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <CalculatorSection
        eyebrow="Prøv selv"
        title="Regn ut deres egen dugnad."
        lead="Tallene oppdateres mens dere skriver."
        showVolumeOptions={false}
      />

      <ClosingCta />
    </>
  );
}
