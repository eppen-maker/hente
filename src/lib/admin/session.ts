/**
 * Admin session token.
 *
 * A signed, expiring token in an httpOnly cookie — no database table, no
 * third-party service. Uses Web Crypto so the same code runs in middleware
 * (edge) and in server actions (node).
 *
 * The signing key is derived from ADMIN_PASSWORD, so changing the password
 * invalidates every existing session.
 */

export const ADMIN_COOKIE = "sorkyst_admin";

/** How long a session lasts before a fresh login is required. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Token format: "<expiry seconds>.<hex hmac>". */
export async function createSessionToken(secret: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    encoder.encode(String(expiry)),
  );
  return `${expiry}.${toHex(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expirySeconds = Number(expiry);
  if (!Number.isFinite(expirySeconds) || expirySeconds < Date.now() / 1000) {
    return false;
  }

  const bytes = signature.match(/.{2}/g);
  if (!bytes || bytes.length !== 32) return false;

  // crypto.subtle.verify is constant-time, so a wrong signature leaks nothing
  // about how wrong it was.
  return crypto.subtle.verify(
    "HMAC",
    await key(secret),
    new Uint8Array(bytes.map((byte) => parseInt(byte, 16))),
    encoder.encode(expiry),
  );
}

/** Constant-time comparison for the password itself. */
export async function passwordMatches(
  supplied: string,
  expected: string,
): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}
