import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";

const PILLARS = [
  {
    number: "01",
    title: "Produkter folk bruker",
    body: "Ingen unødvendige produkter som havner i et skap. Refill til såpe, oppvask og vask — varer alle kjøper likevel.",
  },
  {
    number: "02",
    title: "God fortjeneste",
    body: "En betydelig del av hvert salg går rett til organisasjonen. Ingen skjulte ledd, ingen provisjonsmodell.",
  },
  {
    number: "03",
    title: "Enkelt å gjennomføre",
    body: "Vi gjør planlegging, bestilling og utdeling oversiktlig. Én kontaktperson, én leveranse, klar fordeling.",
  },
];

export function ValuePillars() {
  return (
    <Section tone="deep" spacing="md" width="wide">
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {PILLARS.map((pillar, index) => (
          <Reveal key={pillar.number} delay={index * 90} className="bg-canvas">
            <div className="flex h-full flex-col gap-4 p-7 sm:p-9">
              <span className="text-eyebrow text-ink-faint">{pillar.number}</span>
              <h3 className="font-display text-2xl leading-tight text-ink">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{pillar.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
