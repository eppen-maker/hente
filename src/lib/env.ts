/** Environment access with clear failures instead of silent `undefined`. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /**
   * Shared secret for payment settlement — the one write with no user session
   * behind it. Scoped to the `settle_order` database function; it grants
   * nothing else. Everything else runs under RLS with the anon key.
   */
  get serverSecret() {
    return required("SORKYST_SERVER_SECRET");
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get paymentProvider() {
    return (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  },
};
