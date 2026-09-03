/** Norwegian-aware slugification used for club, team and seller URLs. */
const map: Record<string, string> = { æ: "ae", ø: "o", å: "a", Æ: "ae", Ø: "o", Å: "a", ö: "o", ä: "a", ü: "u" };

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[æøåöäü]/g, (c) => map[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sellerSlug(firstName: string, lastName: string): string {
  return slugify(`${firstName} ${lastName}`);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

/** Short human-readable code used for seller links and pickup at the clubhouse. */
export function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
