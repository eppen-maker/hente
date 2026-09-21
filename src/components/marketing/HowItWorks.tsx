import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

export const STEPS = [
  {
    number: "01",
    title: "Velg mål",
    body: "Bestem hvor mye organisasjonen skal tjene på dugnaden.",
  },
  {
    number: "02",
    title: "Fordel salget",
    body: "Se nøyaktig hvor mange produkter hver deltaker må selge.",
  },
  {
    number: "03",
    title: "Selg",
    body: "Medlemmene selger premium SØRKYST-produkter til venner, familie og støttespillere.",
  },
  {
    number: "04",
    title: "Behold fortjenesten",
    body: "Organisasjonen beholder sin avtalte margin fra hvert produkt.",
  },
];

interface HowItWorksProps {
  tone?: "canvas" | "deep" | "sand";
}

export function HowItWorks({ tone = "canvas" }: HowItWorksProps) {
  return (
    <Section id="slik-fungerer-det" tone={tone} spacing="lg" width="wide">
      <SectionHeading
        eyebrow="Slik fungerer det"
        title="Fire steg fra idé til utbetalt fortjeneste."
        lead="Ingen apper å laste ned, ingen kompliserte regneark. Dere velger mål, vi leverer, dere selger."
      />

      <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <Reveal key={step.number} delay={index * 80} className="bg-canvas">
            <li className="flex h-full flex-col gap-5 p-7 sm:p-8">
              <span className="font-display text-4xl leading-none text-accent-soft">{step.number}</span>
              <h3 className="font-display text-xl leading-tight text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
