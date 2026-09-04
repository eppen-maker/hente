import { MockSmsProvider } from "./mock";
import { SveveSmsProvider } from "./sveve";
import type { SmsProvider } from "./types";

const providers = new Map<string, SmsProvider>();

/** Resolve an SMS provider by name; defaults to the SMS_PROVIDER env var. */
export function getSmsProvider(name = process.env.SMS_PROVIDER ?? "mock"): SmsProvider {
  const key = name.toLowerCase();
  const existing = providers.get(key);
  if (existing) return existing;

  const provider: SmsProvider = key === "sveve" ? new SveveSmsProvider() : new MockSmsProvider();
  providers.set(key, provider);
  return provider;
}

export * from "./types";
