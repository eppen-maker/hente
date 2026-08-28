"use client";

import { ArrowRight, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { projectFromProductsPerParticipant } from "@/lib/calc/fundraising";
import { CALCULATOR_DEFAULTS } from "@/lib/config/pricing";
import { clamp, formatCurrency, formatNumber } from "@/lib/format";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/validation/lead";
import type { OrganizationType } from "@/types";

type FieldErrors = Record<string, string>;

const TYPE_OPTIONS = (
  Object.entries(ORGANIZATION_TYPE_LABELS) as [OrganizationType, string][]
).map(([value, label]) => ({ value, label }));

function readNumberParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? clamp(Math.round(parsed), min, max) : fallback;
}

export function StartCampaignForm() {
  const searchParams = useSearchParams();
  const { limits } = CALCULATOR_DEFAULTS;

  const [participants, setParticipants] = useState(() =>
    readNumberParam(
      searchParams.get("deltakere"),
      CALCULATOR_DEFAULTS.participants,
      limits.participants.min,
      limits.participants.max,
    ),
  );
  const [productsPerParticipant, setProductsPerParticipant] = useState(() =>
    readNumberParam(
      searchParams.get("perDeltaker"),
      CALCULATOR_DEFAULTS.productsPerParticipant,
      limits.productsPerParticipant.min,
      limits.productsPerParticipant.max,
    ),
  );

  const profitGoalParam = searchParams.get("mal");
  const profitGoal = profitGoalParam ? Number(profitGoalParam) : undefined;

  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "sports-club" as OrganizationType,
    contactName: "",
    email: "",
    phone: "",
    city: "",
    message: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const projection = useMemo(
    () => projectFromProductsPerParticipant({ participants, productsPerParticipant }),
    [participants, productsPerParticipant],
  );

  const update = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setServerMessage(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          participantCount: participants,
          productsPerParticipant,
          profitGoal: Number.isFinite(profitGoal) ? profitGoal : undefined,
          estimatedProducts: projection.totalProducts,
          estimatedProfit: projection.organizationProfit,
          source: "calculator",
        }),
      });

      const body: { ok?: boolean; errors?: FieldErrors; message?: string } =
        await response.json();

      if (!response.ok || !body.ok) {
        setErrors(body.errors ?? {});
        setServerMessage(body.message ?? "Noe gikk galt. Prøv igjen.");
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setServerMessage("Vi fikk ikke kontakt med serveren. Prøv igjen om litt.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="animate-rise flex flex-col items-start gap-5 rounded-xl border border-line bg-surface p-8 shadow-soft sm:p-12">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-canvas">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h2 className="font-display text-3xl leading-tight text-ink">Takk — vi har fått det.</h2>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Vi tar kontakt innen én virkedag med et konkret tilbud for{" "}
          {form.organizationName || "organisasjonen"}. Utgangspunktet er{" "}
          {formatNumber(projection.totalProducts)} produkter og{" "}
          {formatCurrency(projection.organizationProfit)} til klubben.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {/* Plan */}
      <fieldset className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <legend className="text-eyebrow px-2 text-ink-muted">Dugnaden</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <NumberField
            label="Antall deltakere"
            value={participants}
            onChange={setParticipants}
            min={limits.participants.min}
            max={limits.participants.max}
            step={10}
            suffix="stk"
          />
          <NumberField
            label="Produkter per deltaker"
            value={productsPerParticipant}
            onChange={setProductsPerParticipant}
            min={limits.productsPerParticipant.min}
            max={limits.productsPerParticipant.max}
            step={1}
            suffix="stk"
          />
        </div>

        <dl className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-faint">Produkter totalt</dt>
            <dd className="tabular font-display text-2xl text-ink">
              {formatNumber(projection.totalProducts)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Til klubben</dt>
            <dd className="tabular font-display text-2xl text-ink">
              {formatCurrency(projection.organizationProfit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Totalt salg</dt>
            <dd className="tabular font-display text-2xl text-ink">
              {formatCurrency(projection.totalConsumerSales)}
            </dd>
          </div>
        </dl>
      </fieldset>

      {/* Contact */}
      <fieldset className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <legend className="text-eyebrow px-2 text-ink-muted">Kontaktinformasjon</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Organisasjon"
            name="organizationName"
            autoComplete="organization"
            placeholder="Kristiansand FK"
            value={form.organizationName}
            onChange={(event) => update("organizationName")(event.target.value)}
            error={errors.organizationName}
            required
          />
          <SelectField
            label="Type organisasjon"
            name="organizationType"
            options={TYPE_OPTIONS}
            value={form.organizationType}
            onChange={(event) => update("organizationType")(event.target.value)}
          />
          <TextField
            label="Ditt navn"
            name="contactName"
            autoComplete="name"
            placeholder="Ingrid Solheim"
            value={form.contactName}
            onChange={(event) => update("contactName")(event.target.value)}
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
            value={form.email}
            onChange={(event) => update("email")(event.target.value)}
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
            value={form.phone}
            onChange={(event) => update("phone")(event.target.value)}
            hint="Valgfritt"
          />
          <TextField
            label="Sted"
            name="city"
            autoComplete="address-level2"
            placeholder="Kristiansand"
            value={form.city}
            onChange={(event) => update("city")(event.target.value)}
            hint="Valgfritt"
          />
        </div>

        <TextAreaField
          label="Noe vi bør vite?"
          name="message"
          placeholder="Når passer det å gjennomføre dugnaden? Hvor mange lag er med?"
          value={form.message}
          onChange={(event) => update("message")(event.target.value)}
        />
      </fieldset>

      {serverMessage ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {serverMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-relaxed text-ink-faint">
          Vi bruker opplysningene kun til å kontakte dere om dugnaden. Ingen
          binding før dere har fått et tilbud.
        </p>
        <Button type="submit" size="lg" disabled={status === "sending"} className="shrink-0">
          {status === "sending" ? "Sender …" : "Send forespørsel"}
          <ArrowRight className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </form>
  );
}
