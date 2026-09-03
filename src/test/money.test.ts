import { describe, expect, it } from "vitest";
import { divideRound, formatOre, kronerToOre, multiply, oreToDecimalString, oreToKroner, sum } from "@/lib/money";

describe("money primitives", () => {
  it("converts kroner to øre without float drift", () => {
    expect(kronerToOre(199)).toBe(19_900);
    expect(kronerToOre(0.1)).toBe(10);
    expect(kronerToOre(19.99)).toBe(1_999);
    expect(kronerToOre(1.005)).toBe(101); // Math.round(1.005 * 100) would give 100
    expect(kronerToOre("199,50")).toBe(19_950);
    expect(kronerToOre(-5.5)).toBe(-550);
    expect(oreToKroner(19_900)).toBe(199);
  });

  it("multiplies with integer safety", () => {
    expect(multiply(19_900, 5)).toBe(99_500);
    expect(multiply(19_900, 0)).toBe(0);
    expect(() => multiply(19_900, 1.5)).toThrow();
    expect(() => multiply(199.5, 2)).toThrow();
  });

  it("rounds half up", () => {
    expect(divideRound(5, 2)).toBe(3);
    expect(divideRound(4, 2)).toBe(2);
    expect(divideRound(1, 3)).toBe(0);
    expect(divideRound(-5, 2)).toBe(-3);
    expect(() => divideRound(1, 0)).toThrow();
  });

  it("sums exactly over many orders", () => {
    const values = Array.from({ length: 1000 }, () => 19_900);
    expect(sum(values)).toBe(19_900_000);
  });

  it("formats Norwegian amounts", () => {
    expect(formatOre(19_900)).toBe("199 kr");
    expect(formatOre(19_950)).toBe("199,50 kr");
    expect(oreToDecimalString(19_950)).toBe("199.50");
    expect(oreToDecimalString(19_900)).toBe("199.00");
    expect(oreToDecimalString(5)).toBe("0.05");
  });
});
