export interface SmsMessage {
  /** Recipient in E.164 without the plus, e.g. 4790000000. */
  to: string;
  body: string;
}

export interface SmsResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

/**
 * SMS contract. Nothing outside this folder knows how a text is sent, exactly
 * like the payment provider abstraction.
 */
export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsResult>;
}
