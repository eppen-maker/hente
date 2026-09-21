import type { Metadata } from "next";
import { Boxes, HandCoins, Handshake, Users } from "lucide-react";

import { CalculatorSection } from "@/components/marketing/CalculatorSection";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { Faq, type FaqItem } from "@/components/marketing/Faq";
import { PageHero } from "@/components/marketing/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { resolvePricing } from "@/lib/config/pricing";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/validation/lead";

export const metadata: Metadata = {
  title: "For klubber",
  description:
    "For idrettslag, korps, foreninger og skoleklasser som vil ha en dugnad med reell fortjeneste og lite administrasjon.",
};

const SUPPORT = [
  {
    icon: Users,
    title: "Én kontaktperson",
    body: "Dere har én rådgiver hos SØRKYST gjennom hele dugnaden. Ingen kundesenter, ingen kølapp.",
  },
  {
    icon: Boxes,
    title: "Sortert levering",
    body: "Varene kommer ferdig fordelt per lag eller gruppe, til én adresse dere velger.",
  },
  {
    icon: HandCoins,
    title: "Faktura etter levering",
    body: "Organisasjonen betaler først etter at varene er levert, med 30 dagers forfall.",
  },
  {
    icon: Handshake,
    title: "Ingen bindingstid",
    body: "En dugnad er en dugnad. Dere bestemmer selv om dere vil gjenta den til neste sesong.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Hvor mange må vi være for å komme i gang?",
    answer:
      "Minste bestilling er 500 produkter. Et lag på 20 spillere som selger 25 produkter hver er nok, men de fleste klubber kjører dugnaden på tvers av flere lag.",
  },
  {
    question: "Må vi betale før vi har solgt?",
    answer:
      "Nei. Dere får faktura etter levering med 30 dagers forfall, slik at salget kan gjennomføres først.",
  },
  {
    question: "Hva om vi blir sittende igjen med varer?",
    answer:
      "Ubrutte kartonger kan returneres etter avtale. Vi anbefaler likevel å forhåndsselge, slik at bestillingen treffer nøyaktig.",
  },
  {
    question: "Kan vi ta betalt mer eller mindre enn veiledende pris?",
    answer:
      "Utsalgsprisen er veiledende. Organisasjonen står fritt til å justere den — innkjøpsprisen og dermed fortjenesten per produkt er den samme uansett.",
  },
  {
    question: "Hvordan fordeler vi salget mellom deltakerne?",
    answer:
      "Kalkulatoren viser hvor mange produkter hver deltaker må selge for å nå målet. Tallet rundes alltid opp, slik at dere lander på eller over målet.",
  },
  {
    question: "Hvor lang tid tar en dugnad?",
    answer:
      "De fleste gjennomfører på fire uker: én uke til avtale, én til forberedelse og to til salg og levering.",
  },
];

export default function ForClubsPage() {
  const pricing = resolvePricing();
  const audience = Object.values(ORGANIZATION_TYPE_LABELS).filter(
    (label) => label !== "Annet",
  );

  return (
    <>
      <PageHero
        eyebrow="For klubber"
        title="Laget for organisasjoner som er lei av å selge dopapir."
        lead={`Samme innsats, høyere verdi per salg. ${formatCurrency(
          pricing.organizationMargin,
        )} av hvert produkt går rett til organisasjonen.`}
      >
        <div className="flex flex-wrap gap-2 pt-2">
          {audience.map((label) => (
            <span
              key={label}
              className="rounded-full border border-line-strong bg-canvas px-3.5 py-1.5 text-sm text-ink-muted"
            >
              {label}
            </span>
          ))}
        </div>
      </PageHero>

      <Section tone="canvas" spacing="lg" width="wide">
        <SectionHeading
          eyebrow="Det praktiske"
          title="Vi tar administrasjonen. Dere tar salget."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SUPPORT.map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <div className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-7 shadow-soft">
                <item.icon className="size-5 text-ink-muted" strokeWidth={1.25} />
                <h3 className="font-display text-lg leading-tight text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sand" spacing="lg" width="wide">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeading eyebrow="Spørsmål" title="Det klubbene lurer på." />
            <ButtonLink href="/kontakt" variant="secondary" className="self-start">
              Still oss et spørsmål
            </ButtonLink>
          </div>
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      <Section tone="ink" spacing="md" width="wide">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            ["Minste bestilling", `${formatNumber(500)} produkter`],
            ["Fortjeneste per produkt", formatCurrency(pricing.organizationMargin)],
            ["Betalingsfrist", "30 dager"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2">
              <span className="text-eyebrow text-canvas/50">{label}</span>
              <span className="tabular font-display text-3xl text-canvas sm:text-4xl">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <CalculatorSection
        eyebrow="Kalkulator"
        title="Sett inn deres egne tall."
        lead="Kalkulatoren bruker gjeldende dugnadspris og oppdateres mens dere skriver."
      />

      <ClosingCta />
    </>
  );
}
