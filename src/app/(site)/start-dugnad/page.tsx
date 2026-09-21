import type { Metadata } from "next";
import { Suspense } from "react";

import { StartCampaignForm } from "@/components/forms/StartCampaignForm";
import { PageHero } from "@/components/marketing/PageHero";
import { STEPS } from "@/components/marketing/HowItWorks";
import { Section } from "@/components/ui/Section";
import { COMPANY } from "@/lib/config/navigation";
import { resolvePricing } from "@/lib/config/pricing";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = {
  title: "Start en dugnad",
  description:
    "Send inn tallene deres, så får dere et konkret tilbud innen én virkedag.",
};

function FormFallback() {
  return (
    <div className="h-[32rem] animate-pulse rounded-xl border border-line bg-surface" />
  );
}

export default function StartCampaignPage() {
  const pricing = resolvePricing();

  return (
    <>
      <PageHero
        eyebrow="Start en dugnad"
        title="Fortell oss om laget, så regner vi resten."
        lead="Dere får et konkret tilbud innen én virkedag. Ingen binding før dere har sagt ja."
      />

      <Section tone="canvas" spacing="lg" width="wide">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16">
          <Suspense fallback={<FormFallback />}>
            <StartCampaignForm />
          </Suspense>

          <aside className="flex flex-col gap-10 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-5 rounded-xl bg-sand p-7">
              <h2 className="font-display text-xl text-ink">Slik går vi frem</h2>
              <ol className="flex flex-col gap-4">
                {STEPS.map((step) => (
                  <li key={step.number} className="flex gap-4">
                    <span className="text-eyebrow mt-1 text-ink-faint">{step.number}</span>
                    <div>
                      <p className="text-sm font-medium text-ink">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-7 text-sm">
              <h2 className="font-display text-xl text-ink">Heller snakke med noen?</h2>
              <a
                href={`mailto:${COMPANY.email}`}
                className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
              >
                {COMPANY.email}
              </a>
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="text-ink-muted">
                {COMPANY.phone}
              </a>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                Veiledende utsalgspris {formatCurrency(pricing.consumerPrice)}. Klubbens
                innkjøpspris {formatCurrency(pricing.organizationPrice)} inkl. mva.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
