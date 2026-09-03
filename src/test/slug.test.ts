import { describe, expect, it } from "vitest";
import { normalizeCode, randomCode, sellerSlug, slugify } from "@/lib/slug";
import { checkoutSchema, toE164 } from "@/lib/validation";

describe("slugs and codes", () => {
  it("slugifies Norwegian names", () => {
    expect(slugify("Søgne FK")).toBe("sogne-fk");
    expect(slugify("Våg FK")).toBe("vag-fk");
    expect(slugify("G2013")).toBe("g2013");
    expect(sellerSlug("Johannes", "Hansen")).toBe("johannes-hansen");
    expect(sellerSlug("Ærlend", "Ødegård")).toBe("aerlend-odegard");
  });

  it("generates unambiguous pickup codes", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = randomCode(6);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
    expect(normalizeCode(" abc-123 ")).toBe("ABC123");
  });
});

describe("checkout validation", () => {
  const base = { clubSlug: "sogne-fk", teamSlug: "g2013", sellerSlug: "johannes-hansen", customerName: "Kari Olsen" };

  it("accepts a valid Norwegian order", () => {
    const result = checkoutSchema.safeParse({ ...base, quantity: 2, customerPhone: "900 00 000" });
    expect(result.success).toBe(true);
  });

  it("rejects bad quantities and phone numbers", () => {
    expect(checkoutSchema.safeParse({ ...base, quantity: 0, customerPhone: "90000000" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, quantity: 1, customerPhone: "123" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, quantity: 1, customerPhone: "90000000", customerEmail: "nope" }).success).toBe(false);
  });

  it("normalises phone numbers to E.164 digits", () => {
    expect(toE164("900 00 000")).toBe("4790000000");
    expect(toE164("+47 90000000")).toBe("4790000000");
  });
});
