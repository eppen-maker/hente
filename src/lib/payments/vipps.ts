import {
  PaymentProviderError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProvider,
  type PaymentSnapshot,
  type RefundInput,
  type RefundResult,
  type WebhookEvent,
} from "./types";
import type { PaymentStatus } from "@/lib/types";

/**
 * Vipps ePayment (v1) provider.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED ENVIRONMENT VARIABLES (get these from portal.vipps.no → Utvikler)
 *
 *   VIPPS_API_BASE_URL             https://apitest.vipps.no (test) or https://api.vipps.no (prod)
 *   VIPPS_CLIENT_ID                Client ID for the sales unit
 *   VIPPS_CLIENT_SECRET            Client secret
 *   VIPPS_SUBSCRIPTION_KEY         Ocp-Apim-Subscription-Key
 *   VIPPS_MERCHANT_SERIAL_NUMBER   MSN for the sales unit
 *   VIPPS_WEBHOOK_SECRET           Secret used to verify webhook signatures
 *
 * The request/response shapes below follow the ePayment API. They are wired up
 * and will run as-is against the test environment; everything that cannot be
 * verified without live credentials is marked TODO(vipps).
 * ─────────────────────────────────────────────────────────────────────────────
 */
interface VippsConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
}

export class VippsPaymentProvider implements PaymentProvider {
  readonly name = "vipps";

  private config(): VippsConfig {
    const cfg = {
      baseUrl: process.env.VIPPS_API_BASE_URL ?? "https://apitest.vipps.no",
      clientId: process.env.VIPPS_CLIENT_ID,
      clientSecret: process.env.VIPPS_CLIENT_SECRET,
      subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY,
      merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
    };
    const missing = Object.entries(cfg)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      throw new PaymentProviderError(
        `Vipps is not configured. Missing: ${missing.join(", ")}. Set PAYMENT_PROVIDER=mock to run without Vipps credentials.`,
        this.name,
      );
    }
    return cfg as VippsConfig;
  }

  /** Access token, cached for its lifetime minus a safety margin. */
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private async accessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) return this.tokenCache.token;
    const cfg = this.config();

    const res = await fetch(`${cfg.baseUrl}/accesstoken/get`, {
      method: "POST",
      headers: {
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
        "Merchant-Serial-Number": cfg.merchantSerialNumber,
      },
    });
    if (!res.ok) throw new PaymentProviderError(`Vipps access token failed (${res.status})`, this.name, await res.text());

    const json = (await res.json()) as { access_token: string; expires_in: string };
    const ttlMs = Number(json.expires_in ?? 3600) * 1000;
    this.tokenCache = { token: json.access_token, expiresAt: Date.now() + ttlMs };
    return json.access_token;
  }

  private async headers(idempotencyKey?: string): Promise<Record<string, string>> {
    const cfg = this.config();
    return {
      Authorization: `Bearer ${await this.accessToken()}`,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "Merchant-Serial-Number": cfg.merchantSerialNumber,
      "Content-Type": "application/json",
      "Vipps-System-Name": "sorkyst",
      "Vipps-System-Version": "1.0.0",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const cfg = this.config();
    const body = {
      amount: { currency: input.currency, value: input.amountOre },
      paymentMethod: { type: "WALLET" },
      customer: input.customerPhone ? { phoneNumber: input.customerPhone } : undefined,
      reference: input.orderId,
      returnUrl: input.returnUrl,
      userFlow: "WEB_REDIRECT",
      paymentDescription: input.description.slice(0, 100),
    };

    const res = await fetch(`${cfg.baseUrl}/epayment/v1/payments`, {
      method: "POST",
      headers: await this.headers(input.orderId),
      body: JSON.stringify(body),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new PaymentProviderError(`Vipps createPayment failed (${res.status})`, this.name, raw);

    const json = raw as { reference: string; redirectUrl: string };
    return {
      providerPaymentId: json.reference,
      providerReference: input.orderId,
      redirectUrl: json.redirectUrl,
      status: "PENDING",
      raw,
    };
  }

  async getPayment(providerPaymentId: string): Promise<PaymentSnapshot> {
    const cfg = this.config();
    const res = await fetch(`${cfg.baseUrl}/epayment/v1/payments/${providerPaymentId}`, {
      headers: await this.headers(),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new PaymentProviderError(`Vipps getPayment failed (${res.status})`, this.name, raw);

    const json = raw as { reference: string; state: string; amount: { value: number } };
    return {
      providerPaymentId,
      providerReference: json.reference,
      status: mapVippsState(json.state),
      amountOre: json.amount?.value ?? 0,
      raw,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    const cfg = this.config();
    const res = await fetch(`${cfg.baseUrl}/epayment/v1/payments/${input.providerPaymentId}/refund`, {
      method: "POST",
      headers: await this.headers(`refund-${input.providerPaymentId}`),
      body: JSON.stringify({ modificationAmount: { currency: "NOK", value: input.amountOre } }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new PaymentProviderError(`Vipps refund failed (${res.status})`, this.name, raw);

    return { providerPaymentId: input.providerPaymentId, status: "REFUNDED", refundedOre: input.amountOre, raw };
  }

  /**
   * TODO(vipps): verify the HMAC signature before trusting the body.
   * Vipps signs webhooks with `VIPPS_WEBHOOK_SECRET` using the
   * Authorization / X-Ms-Date / X-Ms-Content-Sha256 header triplet.
   * Until the secret is provisioned this only parses the payload, so the
   * webhook route additionally re-reads the payment with `getPayment()`
   * before marking an order paid.
   */
  async parseWebhook(body: unknown, _headers: Record<string, string>): Promise<WebhookEvent | null> {
    void _headers;
    const payload = body as { reference?: string; pspReference?: string; name?: string; success?: boolean } | null;
    if (!payload?.reference) return null;
    return {
      providerPaymentId: payload.pspReference ?? payload.reference,
      providerReference: payload.reference,
      status: mapVippsEventName(payload.name, payload.success),
      raw: payload,
    };
  }
}

function mapVippsState(state: string | undefined): PaymentStatus {
  switch (state) {
    case "CREATED":
      return "PENDING";
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "CAPTURED":
      return "CAPTURED";
    case "REFUNDED":
      return "REFUNDED";
    case "ABORTED":
    case "EXPIRED":
    case "TERMINATED":
      return "FAILED";
    default:
      return "PENDING";
  }
}

function mapVippsEventName(name: string | undefined, success: boolean | undefined): PaymentStatus {
  if (success === false) return "FAILED";
  switch (name) {
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "CAPTURED":
      return "CAPTURED";
    case "REFUNDED":
      return "REFUNDED";
    case "ABORTED":
    case "EXPIRED":
    case "TERMINATED":
    case "CANCELLED":
      return "FAILED";
    default:
      return "PENDING";
  }
}
