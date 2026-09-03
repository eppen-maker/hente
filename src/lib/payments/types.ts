import type { PaymentStatus } from "@/lib/types";

export interface CreatePaymentInput {
  /** Internal order id — used as the idempotency/reference key. */
  orderId: string;
  /** Amount to charge, in øre, VAT included. */
  amountOre: number;
  currency: "NOK";
  /** Text shown to the customer in the payment app. */
  description: string;
  /** Customer mobile number in E.164 (e.g. 4790000000), when available. */
  customerPhone?: string | null;
  /** Where the provider should send the customer back to. */
  returnUrl: string;
}

export interface CreatePaymentResult {
  /** Provider-side payment id. */
  providerPaymentId: string;
  /** Our reference sent to the provider (usually the order id). */
  providerReference: string;
  /** URL the customer must be redirected to in order to pay. */
  redirectUrl: string;
  status: PaymentStatus;
  raw: unknown;
}

export interface PaymentSnapshot {
  providerPaymentId: string;
  providerReference: string;
  status: PaymentStatus;
  amountOre: number;
  raw: unknown;
}

export interface RefundInput {
  providerPaymentId: string;
  amountOre: number;
  reason?: string;
}

export interface RefundResult {
  providerPaymentId: string;
  status: PaymentStatus;
  refundedOre: number;
  raw: unknown;
}

/**
 * Payment provider contract. No payment logic exists outside implementations
 * of this interface — the rest of the app only sees these five types.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  /** Map a provider webhook body onto our own statuses. */
  parseWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookEvent | null>;
}

export interface WebhookEvent {
  providerPaymentId: string;
  providerReference: string;
  status: PaymentStatus;
  raw: unknown;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
