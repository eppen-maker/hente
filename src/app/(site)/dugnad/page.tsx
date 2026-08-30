import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { listPublicCampaigns } from "@/lib/repositories/campaigns";
import { formatCurrency, formatNumber } from "@/lib/format";
import { resolveProductPricing } from "@/lib/config/pricing";

export const metadata: Metadata = {
  title: "Dugnader",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Index of open campaign links. Not linked from the public navigation —
 * clubs reach their own dugnad through a direct link.
 */
export default async function CampaignIndexPage() {
  const campaigns = await listPublicCampaigns();

  return (
    <section className="py-16 sm:py-24">
      <Container width="wide">
        <div className="flex flex-col gap-4">
          <span className="text-eyebrow text-ink-muted">Dugnader</span>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            Åpne dugnader
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
            Hver organisasjon har sin egen lenke med avtalt pris.
          </p>
        </div>

        {campaigns.length === 0 ? (
          <p className="mt-12 text-sm text-ink-muted">
            Ingen åpne dugnader akkurat nå.
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(({ campaign, organization, product, pricing, volumeTiers }) => {
              const unit = resolveProductPricing({
                product,
                campaignPricing: pricing,
                volumeTiers,
                quantity: 0,
              });

              return (
                <li key={campaign.id}>
                  <Link
                    href={`/dugnad/${campaign.slug}`}
                    className="group flex h-full flex-col justify-between gap-6 rounded-xl border border-line bg-surface p-7 shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="text-eyebrow text-ink-faint">{campaign.name}</span>
                      <span className="font-display text-2xl leading-tight text-ink">
                        {organization.name}
                      </span>
                    </div>

                    <dl className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-muted">Deltakere</dt>
                        <dd className="tabular text-ink">
                          {formatNumber(campaign.participants)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-muted">Til klubben per produkt</dt>
                        <dd className="tabular text-ink">
                          {formatCurrency(unit.organizationMargin)}
                        </dd>
                      </div>
                    </dl>

                    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                      Åpne dugnaden
                      <ArrowUpRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.5}
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </section>
  );
}
