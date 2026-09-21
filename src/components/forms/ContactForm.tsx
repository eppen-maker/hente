"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/validation/lead";
import type { OrganizationType } from "@/types";

type FieldErrors = Record<string, string>;

const TYPE_OPTIONS = (
  Object.entries(ORGANIZATION_TYPE_LABELS) as [OrganizationType, string][]
).map(([value, label]) => ({ value, label }));

export function ContactForm() {
  const [form, setForm] = useState({
    organizationName: "",
    organizationType: "sports-club" as OrganizationType,
    contactName: "",
    email: "",
    phone: "",
    participantCount: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);

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
          participantCount: form.participantCount || 1,
          source: "contact",
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
      <div className="animate-rise flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-8 shadow-soft">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-canvas">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h2 className="font-display text-2xl text-ink">Meldingen er sendt.</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Vi svarer normalt innen én virkedag.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Ditt navn"
          name="contactName"
          autoComplete="name"
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
          value={form.email}
          onChange={(event) => update("email")(event.target.value)}
          error={errors.email}
          required
        />
        <TextField
          label="Organisasjon"
          name="organizationName"
          autoComplete="organization"
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
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => update("phone")(event.target.value)}
          hint="Valgfritt"
        />
        <TextField
          label="Antall deltakere"
          name="participantCount"
          inputMode="numeric"
          value={form.participantCount}
          onChange={(event) => update("participantCount")(event.target.value)}
          error={errors.participantCount}
          hint="Omtrentlig er greit"
        />
      </div>

      <TextAreaField
        label="Melding"
        name="message"
        rows={5}
        value={form.message}
        onChange={(event) => update("message")(event.target.value)}
      />

      {serverMessage ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {serverMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={status === "sending"} className="self-start">
        {status === "sending" ? "Sender …" : "Send melding"}
        <ArrowRight className="size-4" strokeWidth={1.5} />
      </Button>
    </form>
  );
}
