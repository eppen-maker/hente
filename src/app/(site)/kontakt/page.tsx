import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/ui/Section";
import { COMPANY } from "@/lib/config/navigation";

export const metadata: Metadata = {
  title: "Kontakt oss",
  description: "Spørsmål om dugnad, produkter eller priser? Vi svarer innen én virkedag.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Kontakt"
        title="Vi svarer innen én virkedag."
        lead="Spørsmål om produkter, priser eller gjennomføring — send oss noen linjer."
      />

      <Section tone="canvas" spacing="lg" width="wide">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <ContactForm />

          <aside className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-eyebrow text-ink-faint">Direkte</h2>
              <p className="font-display text-2xl text-ink">{COMPANY.contactName}</p>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="text-lg text-ink underline decoration-line-strong underline-offset-[6px] transition-colors hover:decoration-ink"
              >
                {COMPANY.phone}
              </a>
              <a
                href={`mailto:${COMPANY.email}`}
                className="text-lg text-ink underline decoration-line-strong underline-offset-[6px] transition-colors hover:decoration-ink"
              >
                {COMPANY.email}
              </a>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-8">
              <h2 className="text-eyebrow text-ink-faint">Besøk</h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                SØRKYST AS
                <br />
                {COMPANY.city}
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-8">
              <h2 className="text-eyebrow text-ink-faint">Åpningstid</h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Mandag til fredag, 08–16
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
