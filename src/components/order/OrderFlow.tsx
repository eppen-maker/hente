"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { calculateOrder, type OrderCalculation } from "@/lib/calc/order";
import {
  calculateProductsPerParticipant,
  calculateRequiredProducts,
} from "@/lib/calc/fundraising";
import { resolveProductPricing } from "@/lib/config/pricing";
import { clamp } from "@/lib/format";
import { OrderConfirmation } from "./OrderConfirmation";
import { OrderProgress } from "./OrderProgress";
import { OrderSummaryBar, OrderSummaryPanel } from "./OrderSummary";
import { StepCampaign, StepGoal, StepQuantity, StepSummary } from "./OrderSteps";
import {
  ORDER_STEPS,
  type OrderContext,
  type OrderDraft,
  type OrderReceipt,
  type OrderStepId,
} from "./context";

type Errors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Which step a server-side field error belongs to. */
const FIELD_STEPS: Record<string, OrderStepId> = {
  organizationName: 1,
  organizationNumber: 1,
  contactName: 1,
  email: 1,
  phone: 1,
  participants: 1,
  quantity: 3,
  goalMode: 2,
  address: 4,
  postalCode: 4,
  city: 4,
  requestedDeliveryDate: 4,
  notes: 4,
};

interface OrderFlowProps {
  context: OrderContext;
  /** Prefill carried over from the calculator, via the query string. */
  initialQuantity?: number;
  initialParticipants?: number;
}

export function OrderFlow({
  context,
  initialQuantity,
  initialParticipants,
}: OrderFlowProps) {
  const { campaign, product, campaignPricing, volumeTiers } = context;

  const [core, setCore] = useState<Omit<OrderDraft, "quantity">>({
    organizationName: campaign?.organizationName ?? "",
    organizationNumber: "",
    contactName: "",
    email: "",
    phone: "",
    participants: initialParticipants ?? campaign?.participants ?? 600,
    // A campaign with a target starts from the goal the club already set.
    goalMode: campaign?.targetProfit ? "profit-goal" : "per-participant",
    productsPerParticipant: 10,
    profitGoal: campaign?.targetProfit ?? 500_000,
    address: "",
    postalCode: "",
    city: campaign?.organizationCity ?? "",
    requestedDeliveryDate: "",
    notes: "",
  });

  /** Set once the club picks a quantity explicitly; null means "follow the goal". */
  const [quantityOverride, setQuantityOverride] = useState<number | null>(
    initialQuantity
      ? clamp(initialQuantity, context.minQuantity, context.maxQuantity)
      : null,
  );
  const [step, setStep] = useState<OrderStepId>(1);
  const [furthest, setFurthest] = useState<OrderStepId>(1);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  /** Unit economics at zero volume — enough to derive a goal-based quantity. */
  const basePricing = useMemo(
    () => resolveProductPricing({ product, campaignPricing, volumeTiers, quantity: 0 }),
    [product, campaignPricing, volumeTiers],
  );

  /** The quantity implied by the answer in step 2. */
  const suggestedQuantity = useMemo(() => {
    const participants = Math.max(1, core.participants);

    if (core.goalMode === "profit-goal") {
      const required = calculateRequiredProducts(
        core.profitGoal,
        basePricing.organizationMargin,
      );
      // Round up per participant so the club lands on or above its goal.
      return calculateProductsPerParticipant(required, participants) * participants;
    }

    if (core.goalMode === "per-participant") {
      return participants * Math.max(1, core.productsPerParticipant);
    }

    return context.minQuantity;
  }, [
    core.goalMode,
    core.participants,
    core.productsPerParticipant,
    core.profitGoal,
    basePricing.organizationMargin,
    context.minQuantity,
  ]);

  const quantity = quantityOverride ?? suggestedQuantity;

  const draft: OrderDraft = { ...core, quantity };

  const projectQuantity = useMemo(
    () =>
      (value: number): OrderCalculation =>
        calculateOrder({
          product,
          campaignPricing,
          volumeTiers,
          quantity: value,
          participants: core.participants,
        }),
    [product, campaignPricing, volumeTiers, core.participants],
  );

  const calculation = useMemo(
    () => projectQuantity(quantity),
    [projectQuantity, quantity],
  );

  function update<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    if (key === "quantity") {
      setQuantityOverride(
        clamp(Number(value), context.minQuantity, context.maxQuantity),
      );
    } else {
      // Changing how the goal is expressed re-derives the quantity.
      if (key === "goalMode" || key === "productsPerParticipant" || key === "profitGoal") {
        setQuantityOverride(null);
      }
      setCore((current) => ({ ...current, [key]: value }));
    }

    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function validateStep(target: OrderStepId): Errors {
    const found: Errors = {};

    if (target === 1) {
      if (core.organizationName.trim().length < 2) {
        found.organizationName = "Skriv inn navnet på organisasjonen.";
      }
      if (core.organizationNumber && !/^\d{9}$/.test(core.organizationNumber.trim())) {
        found.organizationNumber = "Organisasjonsnummer må være 9 siffer.";
      }
      if (core.contactName.trim().length < 2) {
        found.contactName = "Skriv inn navnet ditt.";
      }
      if (!EMAIL_PATTERN.test(core.email.trim())) {
        found.email = "Skriv inn en gyldig e-postadresse.";
      }
      if (core.participants < 1) {
        found.participants = "Antall deltakere må være minst 1.";
      }
    }

    if (target === 2 || target === 3) {
      if (quantity < context.minQuantity) {
        found.quantity = `Minste bestilling er ${context.minQuantity} produkter.`;
      }
      if (quantity > context.maxQuantity) {
        found.quantity = "Ta kontakt med oss for bestillinger av denne størrelsen.";
      }
    }

    if (target === 4 && core.postalCode && !/^\d{4}$/.test(core.postalCode.trim())) {
      found.postalCode = "Postnummer må være 4 siffer.";
    }

    return found;
  }

  function goTo(next: OrderStepId) {
    setStep(next);
    setFurthest((current) => (next > current ? next : current));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNext() {
    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step < 4) goTo((step + 1) as OrderStepId);
    else void submit();
  }

  async function submit() {
    // Re-run every step's checks before sending.
    const found = { ...validateStep(1), ...validateStep(3), ...validateStep(4) };
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const firstField = Object.keys(found)[0];
      const target = firstField ? FIELD_STEPS[firstField] : undefined;
      if (target) goTo(target);
      return;
    }

    setStatus("sending");
    setServerMessage(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Deliberately no prices: the server recalculates everything.
        body: JSON.stringify({
          campaignSlug: campaign?.slug,
          organizationName: core.organizationName,
          organizationNumber: core.organizationNumber || undefined,
          contactName: core.contactName,
          email: core.email,
          phone: core.phone || undefined,
          participants: core.participants,
          quantity,
          goalMode: core.goalMode,
          targetProfit: core.goalMode === "profit-goal" ? core.profitGoal : undefined,
          address: core.address || undefined,
          postalCode: core.postalCode || undefined,
          city: core.city || undefined,
          requestedDeliveryDate: core.requestedDeliveryDate || undefined,
          notes: core.notes || undefined,
        }),
      });

      const body: {
        ok?: boolean;
        errors?: Errors;
        message?: string;
        orderNumber?: string;
        summary?: OrderReceipt["summary"];
      } = await response.json();

      if (!response.ok || !body.ok || !body.orderNumber || !body.summary) {
        setErrors(body.errors ?? {});
        setServerMessage(body.message ?? "Noe gikk galt. Prøv igjen.");
        setStatus("error");
        const firstField = Object.keys(body.errors ?? {})[0];
        const target = firstField ? FIELD_STEPS[firstField] : undefined;
        if (target) goTo(target);
        return;
      }

      setReceipt({ orderNumber: body.orderNumber, summary: body.summary });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerMessage("Vi fikk ikke kontakt med serveren. Prøv igjen om litt.");
      setStatus("error");
    }
  }

  if (receipt) {
    return (
      <OrderConfirmation
        receipt={receipt}
        organizationName={core.organizationName || campaign?.organizationName || "klubben"}
      />
    );
  }

  const stepProps = { draft, update, context, calculation, errors };
  const ctaLabel = step === 4 ? "Send bestilling" : "Neste";

  return (
    <div ref={topRef} className="scroll-mt-28">
      <OrderProgress current={step} furthest={furthest} onNavigate={goTo} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="flex flex-col gap-10">
          {step === 1 ? <StepCampaign {...stepProps} /> : null}
          {step === 2 ? <StepGoal {...stepProps} /> : null}
          {step === 3 ? (
            <StepQuantity
              {...stepProps}
              suggested={suggestedQuantity}
              quantityProjection={projectQuantity}
            />
          ) : null}
          {step === 4 ? <StepSummary {...stepProps} /> : null}

          {serverMessage ? (
            <p role="alert" className="text-sm text-[#8a3a2a]">
              {serverMessage}
            </p>
          ) : null}

          <div className="hidden items-center justify-between gap-4 border-t border-line pt-8 lg:flex">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => goTo((step - 1) as OrderStepId)}
                disabled={status === "sending"}
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} />
                Tilbake
              </Button>
            ) : (
              <span />
            )}

            <Button size="lg" onClick={handleNext} disabled={status === "sending"}>
              {status === "sending" ? "Sender …" : ctaLabel}
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Mobile: back sits above the sticky bar, forward lives in it. */}
          {step > 1 ? (
            <div className="lg:hidden">
              <Button
                variant="ghost"
                onClick={() => goTo((step - 1) as OrderStepId)}
                disabled={status === "sending"}
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} />
                Tilbake
              </Button>
            </div>
          ) : null}
        </div>

        <OrderSummaryPanel
          calculation={calculation}
          campaign={campaign}
          organizationName={core.organizationName}
          productName={product.name}
        />
      </div>

      <OrderSummaryBar
        calculation={calculation}
        campaign={campaign}
        organizationName={core.organizationName}
        productName={product.name}
        ctaLabel={ctaLabel}
        onContinue={handleNext}
        pending={status === "sending"}
      />

      <p className="mt-8 text-xs leading-relaxed text-ink-faint">
        Steg {step} av {ORDER_STEPS.length}. Ingen betaling nå — organisasjonen
        faktureres etter levering.
      </p>
    </div>
  );
}
