"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Club portal sign-in.
 *
 * Uses a Supabase magic link when Supabase is configured. Until the portal
 * and the CRM behind it are built, the form states plainly that access is
 * being rolled out rather than pretending to log anyone in.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "unavailable" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("unavailable");
      return;
    }

    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/logg-inn` },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="animate-rise flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-8 shadow-soft">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-canvas">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h2 className="font-display text-2xl text-ink">Sjekk innboksen.</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Vi har sendt en innloggingslenke til {email}.
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
      <TextField
        label="E-post"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="deg@klubben.no"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Sender lenke …" : "Send innloggingslenke"}
        <ArrowRight className="size-4" strokeWidth={1.5} />
      </Button>

      {status === "unavailable" ? (
        <p className="flex items-start gap-2 rounded-lg bg-sand p-4 text-sm leading-relaxed text-ink-muted">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <span>
            Klubbportalen rulles ut for kunder nå. Ta kontakt med rådgiveren
            deres, så åpner vi tilgang for organisasjonen.
          </span>
        </p>
      ) : null}

      {status === "error" && message ? (
        <p role="alert" className="text-sm text-[#8a3a2a]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
