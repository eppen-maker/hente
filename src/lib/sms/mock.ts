import type { SmsMessage, SmsProvider, SmsResult } from "./types";

/**
 * Development / demo provider. Sends nothing, but every message is still
 * written to `sms_messages`, so the club can see exactly what would have gone
 * out and the flow is testable end to end without a provider account.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";

  async send(message: SmsMessage): Promise<SmsResult> {
    console.info(`[sms:mock] -> ${message.to}: ${message.body}`);
    return { ok: true, providerRef: `mock_${Date.now()}` };
  }
}
