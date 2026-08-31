import type { Metadata } from "next";
import Link from "next/link";

import { OrderFlow } from "@/components/order/OrderFlow";
import { Container } from "@/components/ui/Container";
import { buildOrderContext, readOrderPrefill } from "@/lib/order-context";

export const metadata: Metadata = {
  title: "Bestill dugnad",
  description:
    "Sett opp dugnaden, se fortjenesten og send bestillingen. Ingen betaling nå.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrderPage({ searchParams }: PageProps) {
  const context = await buildOrderContext(null);
  const prefill = readOrderPrefill(await searchParams);

  return (
    <section className="py-12 sm:py-16">
      <Container width="wide">
        <div className="mb-10 flex flex-col gap-3">
          <span className="text-eyebrow text-ink-muted">Bestilling</span>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            Sett opp dugnaden deres
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
            Fire steg. Tallene oppdateres mens dere fyller ut, og dere ser
            fortjenesten før dere sender. Ingen betaling nå — dere får et
            tilbud å si ja eller nei til.
          </p>
          <p className="text-sm text-ink-faint">
            Ikke klare til å bestille?{" "}
            <Link
              href="/start-dugnad"
              className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              Send en uforpliktende henvendelse i stedet
            </Link>
            .
          </p>
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
