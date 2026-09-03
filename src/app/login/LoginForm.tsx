"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(6, "Minst 6 tegn"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError) {
      setError("Feil e-post eller passord.");
      return;
    }
    router.replace(next || "/");
    router.refresh();
  }

  async function sendMagicLink() {
    setError(null);
    const email = getValues("email");
    if (!email) {
      setError("Skriv inn e-postadressen din først.");
      return;
    }
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (otpError) setError(otpError.message);
    else setMagicLinkSent(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="email">
          E-post
        </label>
        <input id="email" type="email" autoComplete="email" className="field mt-2" {...register("email")} />
        {errors.email ? <p className="mt-1 text-sm text-red-700">{errors.email.message}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="password">
          Passord
        </label>
        <input id="password" type="password" autoComplete="current-password" className="field mt-2" {...register("password")} />
        {errors.password ? <p className="mt-1 text-sm text-red-700">{errors.password.message}</p> : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {magicLinkSent ? <p className="text-sm text-emerald-700">Innloggingslenke sendt. Sjekk e-posten din.</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Logger inn…" : "Logg inn"}
      </Button>

      <button type="button" onClick={sendMagicLink} className="w-full text-center text-sm text-navy-400 hover:text-navy-900">
        Send meg en innloggingslenke i stedet
      </button>
    </form>
  );
}
