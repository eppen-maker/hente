"use client";

import { Check, Info } from "lucide-react";

import { NumberField } from "@/components/ui/NumberField";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import type { OrderCalculation } from "@/lib/calc/order";
import { formatCurrency, formatNumber, pluralize } from "@/lib/format";
import type { OrderContext, OrderDraft } from "./context";

type Errors = Record<string, string>;

interface StepProps {
  draft: OrderDraft;
  update: <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => void;
  context: OrderContext;
  calculation: OrderCalculation;
  errors: Errors;
}

function StepHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{title}</h2>
      {lead ? (
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted sm:text-base">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Om dugnaden                                                        */
/* -------------------------------------------------------------------------- */

export function StepCampaign({ draft, update, context, errors }: StepProps) {
  const locked = Boolean(context.campaign);

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        title="Om dugnaden"
        lead={
          locked
            ? "Vi har fylt inn det vi vet om dugnaden deres. Bekreft kontaktinformasjonen."
            : "Fortell oss hvem dere er, så regner vi ut resten."
        }
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Organisasjon"
          name="organizationName"
          autoComplete="organization"
          placeholder="Søgne FK"
          value={draft.organizationName}
          onChange={(event) => update("organizationName", event.target.value)}
          error={errors.organizationName}
          readOnly={locked}
          hint={locked ? "Hentet fra dugnadslenken" : undefined}
          required
        />
        <TextField
          label="Organisasjonsnummer"
          name="organizationNumber"
          inputMode="numeric"
          placeholder="912345678"
          value={draft.organizationNumber}
          onChange={(event) => update("organizationNumber", event.target.value)}
          error={errors.organizationNumber}
          hint="Valgfritt"
        />
        <TextField
          label="Kontaktperson"
          name="contactName"
          autoComplete="name"
          placeholder="Ingrid Solheim"
          value={draft.contactName}
          onChange={(event) => update("contactName", event.target.value)}
          error={errors.contactName}
          required
        />
        <TextField
          label="E-post"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ingrid@klubben.no"
          value={draft.email}
          onChange={(event) => update("email", event.target.value)}
          error={errors.email}
          required
        />
        <TextField
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="400 00 000"
          value={draft.phone}
          onChange={(event) => update("phone", event.target.value)}
          error={errors.phone}
          hint="Valgfritt"
        />
        <NumberField
          label="Antall deltakere"
          value={draft.participants}
          onChange={(value) => update("participants", value)}
          min={1}
          max={20_000}
          step={10}
          suffix="stk"
          helpText="Spillere, medlemmer og andre som er med på dugnaden."
        />
      </div>

      {errors.participants ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {errors.participants}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Mål                                                                */
/* -------------------------------------------------------------------------- */

const GOAL_OPTIONS = [
  {
    value: "per-participant" as const,
    title: "Produkter per deltaker",
    body: "Dere vet omtrent hvor mye hver deltaker rekker å selge.",
  },
  {
    value: "profit-goal" as const,
    title: "Ønsket fortjeneste",
    body: "Dere vet hva klubbkassen trenger. Vi regner ut innsatsen.",
  },
  {
    value: "total-volume" as const,
    title: "Velg totalantall",
    body: "Dere vet allerede hvor mange produkter dere vil bestille.",
  },
];

export function StepGoal({ draft, update, context, calculation, errors }: StepProps) {
  const margin = calculation.organizationMargin;

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        title="Mål"
        lead="Hvordan vil dere planlegge dugnaden? Tallene oppdateres mens dere velger."
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Planleggingsmåte</legend>
        {GOAL_OPTIONS.map((option) => {
          const active = draft.goalMode === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-lg border p-5 transition-[border-color,background-color] duration-200",
                active
                  ? "border-ink bg-sand"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="goalMode"
                value={option.value}
                checked={active}
                onChange={() => update("goalMode", option.value)}
                className="sr-only"
              />
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                  active ? "border-ink bg-ink text-canvas" : "border-line-strong",
                )}
                aria-hidden
              >
                {active ? <Check className="size-3" strokeWidth={2.5} /> : null}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display text-lg leading-tight text-ink">
                  {option.title}
                </span>
                <span className="text-sm leading-relaxed text-ink-muted">{option.body}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="rounded-lg border border-line bg-canvas-deep p-5 sm:p-6">
        {draft.goalMode === "per-participant" ? (
          <NumberField
            label="Produkter per deltaker"
            value={draft.productsPerParticipant}
            onChange={(value) => update("productsPerParticipant", value)}
            min={1}
            max={100}
            step={1}
            suffix="stk"
            slider
            helpText={`Hver deltaker henter inn ${formatCurrency(
              margin * draft.productsPerParticipant,
            )} til klubben.`}
          />
        ) : null}

        {draft.goalMode === "profit-goal" ? (
          <div className="flex flex-col gap-4">
            <NumberField
              label="Ønsket fortjeneste"
              value={draft.profitGoal}
              onChange={(value) => update("profitGoal", value)}
              min={10_000}
              max={20_000_000}
              step={10_000}
              suffix="kr"
              slider
              sliderStep={10_000}
              helpText={`Vi regner med ${formatCurrency(margin)} i fortjeneste per produkt.`}
            />
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
              <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                Antall per deltaker rundes alltid opp til et helt produkt, slik at
                dere når målet. Med {formatNumber(draft.participants)} deltakere blir
                det {formatNumber(calculation.productsPerParticipant)}{" "}
                {pluralize(calculation.productsPerParticipant, "produkt", "produkter")}{" "}
                hver.
              </span>
            </p>
          </div>
        ) : null}

        {draft.goalMode === "total-volume" ? (
          <NumberField
            label="Totalt antall produkter"
            value={draft.quantity}
            onChange={(value) => update("quantity", value)}
            min={context.minQuantity}
            max={context.maxQuantity}
            step={100}
            suffix="stk"
            helpText={`Minimum ${formatNumber(context.minQuantity)} produkter. Dere kan justere antallet i neste steg.`}
          />
        ) : null}
      </div>

      {errors.quantity ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {errors.quantity}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — Velg antall                                                        */
/* -------------------------------------------------------------------------- */

interface StepQuantityProps extends StepProps {
  /** Quantity implied by the answer in step 2, shown as a recommendation. */
  suggested: number;
  quantityProjection: (quantity: number) => OrderCalculation;
}

export function StepQuantity({
  draft,
  update,
  context,
  errors,
  suggested,
  quantityProjection,
}: StepQuantityProps) {
  // The suggestion from step 2 sits alongside the standard volumes, without
  // duplicating one of them.
  const volumes = [...new Set([...context.quickVolumes, suggested])]
    .filter((volume) => volume >= context.minQuantity)
    .sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        title="Velg antall"
        lead="Vanlige volum er satt opp under. Dere står fritt til å bestille et hvilket som helst antall over minstebestillingen."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {volumes.map((volume) => {
          const projection = quantityProjection(volume);
          const selected = draft.quantity === volume;
          const recommended = volume === suggested;

          return (
            <button
              key={volume}
              type="button"
              onClick={() => update("quantity", volume)}
              aria-pressed={selected}
              className={cn(
                "relative flex flex-col justify-between gap-4 rounded-lg border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:p-5",
                selected
                  ? "border-ink bg-ink text-canvas shadow-lift"
                  : "border-line bg-surface hover:border-line-strong hover:shadow-soft",
              )}
            >
              {recommended && !selected ? (
                <span className="text-eyebrow absolute -top-2 left-4 rounded-full bg-clay px-2.5 py-1 text-ink">
                  Anbefalt
                </span>
              ) : null}

              <div>
                <p className="tabular font-display text-2xl leading-none">
                  {formatNumber(volume)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    selected ? "text-canvas/60" : "text-ink-faint",
                  )}
                >
                  produkter
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p
                  className={cn(
                    "tabular text-sm font-medium",
                    selected ? "text-canvas" : "text-ink",
                  )}
                >
                  {formatCurrency(projection.organizationProfit)}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    selected ? "text-canvas/60" : "text-ink-muted",
                  )}
                >
                  {formatNumber(projection.productsPerParticipant)} per deltaker
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-line bg-canvas-deep p-5 sm:p-6">
        <div className="sm:max-w-sm">
          <NumberField
            label="Egendefinert antall"
            value={draft.quantity}
            onChange={(value) => update("quantity", value)}
            min={context.minQuantity}
            max={context.maxQuantity}
            step={100}
            suffix="stk"
            helpText={`Minimum ${formatNumber(context.minQuantity)} produkter.`}
          />
        </div>
      </div>

      {errors.quantity ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {errors.quantity}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 4 — Oppsummering, levering og innsending                               */
/* -------------------------------------------------------------------------- */

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className={cn("text-sm", strong ? "text-ink" : "text-ink-muted")}>{label}</dt>
      <dd
        className={cn(
          "tabular text-right",
          strong ? "font-display text-lg text-ink" : "text-sm text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function StepSummary({ draft, update, context, calculation, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-10">
      <StepHeading
        title="Oppsummering"
        lead="Sjekk tallene, fyll inn levering, og send bestillingen. Ingen betaling nå."
      />

      {/* The number that matters, given the most weight on the page. */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
        <div className="bg-ink px-6 py-8 text-canvas sm:px-9 sm:py-10">
          <span className="text-eyebrow text-canvas/55">
            Forventet fortjeneste til klubben
          </span>
          <p
            className="tabular mt-4 font-display leading-[0.9]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
          >
            {formatCurrency(calculation.organizationProfit)}
          </p>
        </div>

        <dl className="divide-y divide-line px-6 py-3 sm:px-9">
          <SummaryLine
            label="Organisasjon"
            value={draft.organizationName || context.campaign?.organizationName || "—"}
          />
          <SummaryLine label="Deltakere" value={formatNumber(calculation.participants)} />
          <SummaryLine
            label="Produkter totalt"
            value={formatNumber(calculation.quantity)}
          />
          <SummaryLine
            label="Produkter per deltaker"
            value={formatNumber(calculation.productsPerParticipant)}
          />
          <SummaryLine
            label="Veiledende utsalgspris"
            value={formatCurrency(calculation.consumerPrice)}
          />
          <SummaryLine
            label="Klubbens innkjøpspris"
            value={formatCurrency(calculation.unitPrice)}
          />
          <SummaryLine
            label="Fortjeneste per produkt"
            value={formatCurrency(calculation.organizationMargin)}
          />
          <SummaryLine
            label="Totalt salg til kunder"
            value={formatCurrency(calculation.totalConsumerValue)}
          />
          <SummaryLine
            label="Ordreverdi eks. mva."
            value={formatCurrency(calculation.subtotal)}
          />
          <SummaryLine label="Mva." value={formatCurrency(calculation.vat)} />
          <SummaryLine
            label="Ordreverdi inkl. mva."
            value={formatCurrency(calculation.total)}
            strong
          />
        </dl>
      </div>

      <fieldset className="flex flex-col gap-6">
        <legend className="font-display text-xl text-ink">Levering og kontakt</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Leveringsadresse"
            name="address"
            autoComplete="street-address"
            placeholder="Klubbhusveien 1"
            value={draft.address}
            onChange={(event) => update("address", event.target.value)}
            error={errors.address}
          />
          <div className="grid grid-cols-[8rem_1fr] gap-4">
            <TextField
              label="Postnr."
              name="postalCode"
              inputMode="numeric"
              placeholder="4640"
              value={draft.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
              error={errors.postalCode}
            />
            <TextField
              label="Sted"
              name="city"
              autoComplete="address-level2"
              placeholder="Søgne"
              value={draft.city}
              onChange={(event) => update("city", event.target.value)}
              error={errors.city}
            />
          </div>
          <TextField
            label="Ønsket leveringsdato"
            name="requestedDeliveryDate"
            type="date"
            value={draft.requestedDeliveryDate}
            onChange={(event) => update("requestedDeliveryDate", event.target.value)}
            error={errors.requestedDeliveryDate}
            hint="Valgfritt"
          />
        </div>

        <TextAreaField
          label="Noe vi bør vite?"
          name="notes"
          placeholder="Levering til klubbhuset, sortert per lag."
          value={draft.notes}
          onChange={(event) => update("notes", event.target.value)}
          error={errors.notes}
        />
      </fieldset>
    </div>
  );
}
