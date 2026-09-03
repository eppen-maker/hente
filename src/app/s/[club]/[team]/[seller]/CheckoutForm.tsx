"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { formatOre } from "@/lib/money";
import { norwegianPhone } from "@/lib/validation";

const formSchema = z.object({
  customerName: z.string().trim().min(2, "Oppgi navnet ditt"),
  customerPhone: norwegianPhone,
  customerEmail: z.union([z.string().trim().email("Ugyldig e-postadresse"), z.literal("")]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const QUICK_PICKS = [1, 2, 3, 5, 10];

export function CheckoutForm({
  clubSlug,
  teamSlug,
  sellerSlug,
  unitPriceOre,
  clubEarningOre,
}: {
  clubSlug: string;
  teamSlug: string;
  sellerSlug: string;
  unitPriceOre: number;
  clubEarningOre: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);

  const { total, toTeam } = useMemo(
    () => ({ total: unitPriceOre * quantity, toTeam: clubEarningOre * quantity }),
    [quantity, unitPriceOre, clubEarningOre],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { customerEmail: "" } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubSlug, teamSlug, sellerSlug, quantity, ...values }),
    });

    const payload = (await response.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null;
    if (!response.ok || !payload?.redirectUrl) {
      setServerError(payload?.error ?? "Noe gikk galt. Prøv igjen.");
      return;
    }
    window.location.href = payload.redirectUrl;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
      <section className="card px-5 py-5">
        <p className="label">Antall</p>

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            aria-label="Færre"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-12 w-12 rounded-sm border border-navy-200 text-xl text-navy-900 transition hover:border-navy-900"
          >
            −
          </button>
          <span className="display tabular w-12 text-center text-3xl">{quantity}</span>
          <button
            type="button"
            aria-label="Flere"
            onClick={() => setQuantity((q) => Math.min(200, q + 1))}
            className="h-12 w-12 rounded-sm border border-navy-200 text-xl text-navy-900 transition hover:border-navy-900"
          >
            +
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PICKS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setQuantity(value)}
              className={
                quantity === value
                  ? "min-w-12 rounded-sm border border-navy-900 bg-navy-900 px-3 py-2 text-sm font-medium text-white"
                  : "min-w-12 rounded-sm border border-navy-200 bg-white px-3 py-2 text-sm text-navy-500 transition hover:border-navy-900"
              }
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-navy-100 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-navy-500">{quantity} stk</span>
            <span className="display tabular text-2xl">{formatOre(total)}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-emerald-700">{formatOre(toTeam)} går til laget</p>
        </div>
      </section>

      <section className="card mt-4 space-y-4 px-5 py-5">
        <div>
          <label className="label" htmlFor="customerName">
            Navn
          </label>
          <input id="customerName" autoComplete="name" className="field mt-2" {...register("customerName")} />
          {errors.customerName ? <p className="mt-1 text-sm text-red-700">{errors.customerName.message}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="customerPhone">
            Mobilnummer
          </label>
          <input
            id="customerPhone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="900 00 000"
            className="field mt-2"
            {...register("customerPhone")}
          />
          {errors.customerPhone ? <p className="mt-1 text-sm text-red-700">{errors.customerPhone.message}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="customerEmail">
            E-post <span className="text-navy-300">(valgfritt)</span>
          </label>
          <input id="customerEmail" type="email" autoComplete="email" className="field mt-2" {...register("customerEmail")} />
          {errors.customerEmail ? <p className="mt-1 text-sm text-red-700">{errors.customerEmail.message}</p> : null}
        </div>
      </section>

      {serverError ? <p className="mt-4 text-sm text-red-700">{serverError}</p> : null}

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sender deg til betaling…" : `Betal med Vipps · ${formatOre(total)}`}
      </Button>

      <p className="mt-3 text-center text-xs text-navy-300">Du blir sendt videre for å fullføre betalingen.</p>
    </form>
  );
}
