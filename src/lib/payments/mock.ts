import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentSnapshot,
  RefundInput,
  RefundResult,
  WebhookEvent,
} from "./types";

/**
 * Development / demo provider.
 *
 * Instead of talking to a payment API it redirects the customer to an internal
 * confirmation route that captures the payment. The shape of every response
 * mirrors what a real provider returns so switching providers changes nothing
 * outside this folder.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private readonly store = new Map<string, PaymentSnapshot>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `mock_${input.orderId}`;
    const raw = { provider: "mock", orderId: input.orderId, amount: input.amountOre, createdAt: new Date().toISOString() };

    this.store.set(providerPaymentId, {
      providerPaymentId,
      providerReference: input.orderId,
      status: "AUTHORIZED",
      amountOre: input.amountOre,
      raw,
    });

    const url = new URL(input.returnUrl);
    url.searchParams.set("paymentId", providerPaymentId);
    url.searchParams.set("status", "captured");

    return {
      providerPaymentId,
      providerReference: input.orderId,
      redirectUrl: url.toString(),
      status: "PENDING",
      raw,
    };
  }

  async getPayment(providerPaymentId: string): Promise<PaymentSnapshot> {
    return (
      this.store.get(providerPaymentId) ?? {
        providerPaymentId,
        providerReference: providerPaymentId.replace(/^mock_/, ""),
        status: "CAPTURED",
        amountOre: 0,
        raw: { provider: "mock", reconstructed: true },
      }
    );
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    const existing = this.store.get(input.providerPaymentId);
    if (existing) this.store.set(input.providerPaymentId, { ...existing, status: "REFUNDED" });
    return {
      providerPaymentId: input.providerPaymentId,
      status: "REFUNDED",
      refundedOre: input.amountOre,
      raw: { provider: "mock", refundedAt: new Date().toISOString(), reason: input.reason ?? null },
    };
  }

  async parseWebhook(body: unknown): Promise<WebhookEvent | null> {
    const payload = body as { paymentId?: string; reference?: string; status?: string } | null;
    if (!payload?.paymentId || !payload.reference) return null;
    const status = payload.status === "refunded" ? "REFUNDED" : payload.status === "failed" ? "FAILED" : "CAPTURED";
    return {
      providerPaymentId: payload.paymentId,
      providerReference: payload.reference,
      status,
      raw: payload,
    };
  }
}
