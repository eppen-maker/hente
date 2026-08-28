import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <section className="py-24 sm:py-36">
      <Container width="narrow">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <span className="text-eyebrow text-ink-faint">404</span>
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Denne siden finnes ikke.
          </h1>
          <p className="text-base leading-relaxed text-ink-muted">
            Lenken kan være utdatert. Gå tilbake til forsiden, eller regn ut hva
            dugnaden deres kan gi.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/">Til forsiden</ButtonLink>
            <ButtonLink href="/#kalkulator" variant="secondary">
              Åpne kalkulatoren
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
