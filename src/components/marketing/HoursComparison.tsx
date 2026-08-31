import { Clock, Package } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/components/ui/cn";
import { compareWithTraditionalDugnad } from "@/lib/calc/comparison";
import { formatCurrency, formatNumber } from "@/lib/format";

/**
 * The argument that lands hardest with a club: the same money, counted in
 * evenings instead of kroner.
 */
export function HoursComparison({ tone = "sand" }: { tone?: "canvas" | "deep" | "sand" }) {
  const c = compareWithTraditionalDugnad();

  const columns = [
    {
      icon: Clock,
      eyebrow: "Vanlig dugnad",
      headline: `${formatNumber(c.hoursPerParticipant)} timer hver`,
      rows: [
        ["Deltakere", formatNumber(c.participants)],
        ["Timer per person", formatNumber(c.hoursPerParticipant)],
        ["Timer til sammen", formatNumber(c.totalHours)],
        ["Til klubben", formatCurrency(c.totalProfit)],
        ["Per time", formatCurrency(c.profitPerHour)],
      ],
      dark: false,
    },
    {
      icon: Package,
      eyebrow: "Med SØRKYST",
      headline: `${formatNumber(c.productsPerParticipant)} produkter hver`,
      rows: [
        ["Deltakere", formatNumber(c.participants)],
        ["Produkter per person", formatNumber(c.productsPerParticipant)],
        ["Produkter til sammen", formatNumber(c.productsNeeded)],
        ["Til klubben", formatCurrency(c.totalProfit)],
        ["Per produkt", formatCurrency(c.profitPerProduct)],
      ],
      dark: true,
    },
  ];

  return (
    <Section id="timer" tone={tone} spacing="lg" width="wide">
      <SectionHeading
        eyebrow="Regnet i timer"
        title={`${formatNumber(c.hoursPerParticipant)} timer hver. Eller ${formatNumber(
          c.productsPerParticipant,
        )} produkter hver.`}
        lead={`Et lag på ${formatNumber(c.participants)} som jobber ${formatNumber(
          c.hoursPerParticipant,
        )} timer hver, legger inn ${formatNumber(c.totalHours)} timer for ${formatCurrency(
          c.totalProfit,
        )} — ${formatCurrency(
          c.profitPerHour,
        )} timen. De samme pengene er ${formatNumber(
          c.productsPerParticipant,
        )} produkter per person, solgt til naboer og familie som kjøper såpe likevel.`}
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {columns.map((column, index) => (
          <Reveal key={column.eyebrow} delay={index * 90}>
            <div
              className={cn(
                "flex h-full flex-col gap-7 rounded-xl p-8 sm:p-10",
                column.dark
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink shadow-soft",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span
                  className={cn(
                    "text-eyebrow",
                    column.dark ? "text-canvas/55" : "text-ink-faint",
                  )}
                >
                  {column.eyebrow}
                </span>
                <column.icon
                  className={cn("size-4", column.dark ? "text-canvas/50" : "text-ink-faint")}
                  strokeWidth={1.5}
                />
              </div>

              <p className="font-display text-3xl leading-tight sm:text-4xl">
                {column.headline}
              </p>

              <dl
                className={cn(
                  "flex flex-col divide-y border-t",
                  column.dark ? "divide-canvas/15 border-canvas/15" : "divide-line border-line",
                )}
              >
                {column.rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 py-3.5"
                  >
                    <dt
                      className={cn(
                        "text-sm",
                        column.dark ? "text-canvas/65" : "text-ink-muted",
                      )}
                    >
                      {label}
                    </dt>
                    <dd className="tabular font-display text-lg">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={180}>
        <p className="mt-8 max-w-3xl text-base leading-relaxed text-ink-soft">
          Selger hver {formatNumber(c.ambitiousProductsPerParticipant)} i stedet for{" "}
          {formatNumber(c.productsPerParticipant)}, står det{" "}
          <span className="text-ink">{formatCurrency(c.ambitiousProfit)}</span> i kassa — og
          det er fortsatt ingen vaktliste, ingen kiosk og ingen lørdag i regnet.
        </p>
      </Reveal>
    </Section>
  );
}
