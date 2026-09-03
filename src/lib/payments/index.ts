import { env } from "@/lib/env";
import { MockPaymentProvider } from "./mock";
import { VippsPaymentProvider } from "./vipps";
import type { PaymentProvider } from "./types";

const providers = new Map<string, PaymentProvider>();

/** Resolve a provider by name; defaults to the PAYMENT_PROVIDER env var. */
export function getPaymentProvider(name: string = env.paymentProvider): PaymentProvider {
  const key = name.toLowerCase();
  const existing = providers.get(key);
  if (existing) return existing;

  const provider: PaymentProvider =
    key === "vipps" ? new VippsPaymentProvider() : key === "mock" ? new MockPaymentProvider() : null!;
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);

  providers.set(key, provider);
  return provider;
}

export * from "./types";
