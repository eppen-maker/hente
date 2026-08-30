import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderFlow } from "@/components/order/OrderFlow";
import { Container } from "@/components/ui/Container";
import { buildOrderContext, readOrderPrefill } from "@/lib/order-context";
import { getCampaignBySlug } from "@/lib/repositories/campaigns";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}

export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCampaignBySlug(slug);
  return {
    title: data ? `Bestill — ${data.organization.name}` : "Bestill",
    robots: { index: false, follow: false },
  };
}

export default async function CampaignOrderPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const data = await getCampaignBySlug(slug);
  if (!data) notFound();

  const context = await buildOrderContext(data);
  const prefill = readOrderPrefill(await searchParams);

  return (
    <section className="py-12 sm:py-16">
      <Container width="wide">
        <div className="mb-10 flex flex-col gap-3">
          <span className="text-eyebrow text-ink-muted">
            {data.organization.name} × SØR°
          </span>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            Bestill til {data.campaign.name}
          </h1>
        </div>
        <OrderFlow
          context={context}
          initialQuantity={prefill.quantity}
          initialParticipants={prefill.participants}
        />
      </Container>
    </section>
  );
}
