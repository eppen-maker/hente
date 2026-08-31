import { Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { OrderReceipt } from "./context";

interface OrderConfirmationProps {
  receipt: OrderReceipt;
  organizationName: string;
}

/**
 * Step 6 — confirmation. Every figure here comes from the server's response,
 * so the receipt can never disagree with what was stored.
 */
export function OrderConfirmation({ receipt, organizationName }: OrderConfirmationProps) {
  const { summary, orderNumber } = receipt;

  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-start gap-5">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-canvas">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
          Bestillingen er mottatt.
        </h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Vi tar kontakt innen én virkedag for å bekrefte bestillingen og
          leveringen til {organizationName}. Noter gjerne ordrenummeret under.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
        <div className="bg-ink px-7 py-9 text-canvas sm:px-10 sm:py-11">
          <span className="text-eyebrow text-canvas/55">
            Estimert fortjeneste til klubben
          </span>
          <p
            className="tabular mt-4 font-display leading-[0.9]"
            style={{ fontSize: "clamp(2.75rem, 8vw, 4.5rem)" }}
          >
            {formatCurrency(summary.organizationProfit)}
          </p>
        </div>

        <dl className="grid gap-px bg-line sm:grid-cols-2">
          {[
            ["Ordrenummer", orderNumber],
            ["Produkt", summary.productName],
            ["Antall produkter", formatNumber(summary.quantity)],
            ["Per deltaker", formatNumber(summary.productsPerParticipant)],
            ["Deltakere", formatNumber(summary.participants)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 bg-surface px-7 py-5">
              <dt className="text-xs text-ink-faint">{label}</dt>
              <dd className="tabular font-display text-lg text-ink">{value}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-1 bg-canvas-deep px-7 py-5 sm:col-span-2">
            <dt className="text-xs text-ink-faint">Å betale (inkl. mva.)</dt>
            <dd className="tabular font-display text-2xl text-ink">
              {formatCurrency(summary.total)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">
        Ingen betaling nå. Organisasjonen faktureres etter levering, med 30
        dagers forfall.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Til forsiden</ButtonLink>
        <ButtonLink href="/kontakt" variant="secondary">
          Kontakt oss
        </ButtonLink>
      </div>
    </div>
  );
}
