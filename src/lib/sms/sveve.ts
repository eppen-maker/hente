import type { SmsMessage, SmsProvider, SmsResult } from "./types";

/**
 * Sveve (sveve.no) — Norwegian SMS gateway, common for this kind of use.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED ENVIRONMENT VARIABLES
 *
 *   SMS_PROVIDER=sveve
 *   SVEVE_USER          Account username
 *   SVEVE_PASSWORD      API password
 *   SVEVE_SENDER        Sender name shown on the phone, e.g. "SORKYST"
 *                       (alphanumeric sender names must be registered with Sveve)
 *
 * The request below follows Sveve's documented REST endpoint and will run as
 * soon as an account exists. Swapping to LinkMobility, Twilio or another
 * gateway means adding one more file here — nothing else changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class SveveSmsProvider implements SmsProvider {
  readonly name = "sveve";

  async send(message: SmsMessage): Promise<SmsResult> {
    const user = process.env.SVEVE_USER;
    const password = process.env.SVEVE_PASSWORD;
    const sender = process.env.SVEVE_SENDER ?? "SORKYST";

    if (!user || !password) {
      return { ok: false, error: "Sveve is not configured (SVEVE_USER / SVEVE_PASSWORD)" };
    }

    const url = new URL("https://sveve.no/SMS/SendMessage");
    url.searchParams.set("user", user);
    url.searchParams.set("passwd", password);
    url.searchParams.set("to", message.to);
    url.searchParams.set("from", sender);
    url.searchParams.set("msg", message.body);
    url.searchParams.set("f", "json");

    try {
      const response = await fetch(url, { method: "POST" });
      const raw = (await response.json().catch(() => ({}))) as {
        response?: { msgOkCount?: number; stdSMSCount?: number; ids?: number[]; errors?: unknown[]; fatalError?: string };
      };

      const body = raw.response ?? {};
      if (body.fatalError) return { ok: false, error: body.fatalError };
      if (!body.msgOkCount) return { ok: false, error: JSON.stringify(body.errors ?? body) };

      return { ok: true, providerRef: body.ids?.[0]?.toString() };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "SMS send failed" };
    }
  }
}
