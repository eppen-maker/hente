import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Target, Truck, Users } from "lucide-react";

import { FundraisingCalculator } from "@/components/calculator/FundraisingCalculator";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { getCampaignBySlug } from "@/lib/repositories/campaigns";
import { resolveProductPricing } from "@/lib/config/pricing";
import { formatCurrency, formatNumber } from "@/lib/format";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCampaignBySlug(slug);
  if (!data) return { title: "Dugnad" };

  return {
    title: `${data.organization.name} × SØRKYST`,
    description: `Planlegg dugnaden for ${data.organization.name}. Se fortjenesten og send bestilling.`,
    robots: { index: false, follow: false },
  };
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return null;
  return `${Number(day)}.${Number(month)}.${year}`;
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCampaignBySlug(slug);
  if (!data) notFound();

  const { campaign, organization, product, pricing, volumeTiers } = data;
  const unit = resolveProductPricing({
    product,
    campaignPricing: pricing,
    volumeTiers,
    quantity: 0,
  });

  const orderHref = `/dugnad/${campaign.slug}/bestill`;
  const deadline = formatDate(campaign.orderDeadline);
  const delivery = formatDate(campaign.deliveryDate);

  const facts = [
    {
      icon: Users,
      label: "Deltakere",
      value: formatNumber(campaign.participants),
    },
    {
      icon: Target,
      label: "Mål for dugnaden",
      value: campaign.targetProfit ? formatCurrency(campaign.targetProfit) : "Ikke satt",
    },
    {
      icon: CalendarDays,
      label: "Bestillingsfrist",
      value: deadline ?? "Etter avtale",
    },
    {
      icon: Truck,
      label: "Levering",
      value: delivery ?? "Etter avtale",
    },
  ];

  return (
    <>
      <section className="border-b border-line bg-canvas-deep py-16 sm:py-24">
        <Container width="wide">
          <div className="flex flex-col gap-7">
            <span className="text-eyebrow text-ink-muted">{campaign.name}</span>
            <h1
              className="leading-[0.98] text-balance text-ink"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4.25rem)" }}
            >
              {organization.name} <span className="text-ink-faint">×</span> SØRKYST
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">
              Planlegg deres neste dugnad. Prisene under er avtalt for{" "}
              {organization.name} — regn ut hva dugnaden gir, og send bestillingen
              når dere er klare.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <ButtonLink href={orderHref} size="lg">
                Start bestillingen
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </ButtonLink>
              <ButtonLink href="/slik-fungerer-det" variant="secondary" size="lg">
                Slik fungerer det
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Campaign facts and the agreed pricing */}
      <Section tone="canvas" spacing="md" width="wide">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <Reveal>
            <dl className="grid h-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-3 bg-surface p-6 sm:p-7">
                  <fact.icon className="size-4 text-ink-faint" strokeWidth={1.5} />
                  <dt className="text-xs text-ink-faint">{fact.label}</dt>
                  <dd className="tabular font-display text-xl leading-none text-ink sm:text-2xl">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex h-full flex-col justify-between gap-8 rounded-xl bg-ink p-7 text-canvas sm:p-9">
              <div>
                <span className="text-eyebrow text-canvas/55">Avtalt pris</span>
                <p className="mt-4 font-display text-2xl leading-tight">{product.name}</p>
                {product.sizeMl ? (
                  <p className="mt-1 text-sm text-canvas/60">{formatNumber(product.sizeMl)} ml</p>
                ) : null}
              </div>

              <dl className="flex flex-col divide-y divide-canvas/15 border-t border-canvas/15">
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <dt className="text-sm text-canvas/65">Veiledende utsalgspris</dt>
                  <dd className="tabular font-display text-lg">
                    {formatCurrency(unit.consumerPrice)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <dt className="text-sm text-canvas/65">Klubbens innkjøpspris</dt>
                  <dd className="tabular font-display text-lg">
                    {formatCurrency(unit.organizationPrice)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4">
                  <dt className="text-sm text-canvas">Til klubben per produkt</dt>
                  <dd className="tabular font-display text-2xl">
                    {formatCurrency(unit.organizationMargin)}
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* The calculator, running on this campaign's agreed pricing */}
      <Section id="kalkulator" tone="deep" spacing="lg" width="wide">
        <SectionHeading
          eyebrow="Kalkulator"
          title={`Hva kan ${organization.name} tjene?`}
          lead="Tallene bruker den avtalte prisen for denne dugnaden."
        />
        <FundraisingCalculator
          className="mt-12"
          initialParticipants={campaign.participants}
          initialProfitGoal={campaign.targetProfit ?? undefined}
          pricingOverrides={{
            consumerPrice: unit.consumerPrice,
            organizationPrice: unit.organizationPrice,
          }}
          pricingTiers={volumeTiers.length ? volumeTiers : undefined}
          ctaHrefBase={orderHref}
          ctaLabel="Bestill nå"
        />
      </Section>

      <HowItWorks tone="canvas" />
    </>
  );
}
