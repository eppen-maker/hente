import { describe, expect, it } from "vitest";
import {
  aggregateOrders,
  calculateOrderFinancials,
  progressPercent,
  sumBreakdowns,
  validatePricing,
  vatFromGross,
  vatFromNet,
} from "@/lib/finance";

const pricing = { retailPriceIncVat: 19_900, clubEarningPerUnit: 8_000, vatRateBp: 2_500 };

describe("VAT", () => {
  it("extracts VAT from a VAT-inclusive amount", () => {
    // 119 000 NOK inc. 25 % VAT -> 23 800 NOK VAT
    expect(vatFromGross(11_900_000, 2_500)).toBe(2_380_000);
    expect(vatFromGross(12_500, 2_500)).toBe(2_500);
    expect(vatFromGross(0, 2_500)).toBe(0);
  });

  it("adds VAT on top of a net amount", () => {
    expect(vatFromNet(10_000, 2_500)).toBe(2_500);
    expect(vatFromNet(9_520_000, 2_500)).toBe(2_380_000);
  });

  it("supports other VAT rates", () => {
    expect(vatFromGross(11_200, 1_200)).toBe(1_200);
    expect(vatFromGross(10_000, 0)).toBe(0);
  });
});

describe("order financials", () => {
  it("splits a single unit correctly", () => {
    const result = calculateOrderFinancials(1, pricing);
    expect(result).toEqual({
      quantity: 1,
      grossAmount: 19_900,
      clubEarningAmount: 8_000,
      sorkystAmountIncVat: 11_900,
      vatAmount: 2_380,
      sorkystRevenueExVat: 9_520,
    });
  });

  it("matches the worked example for 1 000 products", () => {
    const result = calculateOrderFinancials(1_000, pricing);
    expect(result.grossAmount).toBe(19_900_000); // 199 000 NOK
    expect(result.clubEarningAmount).toBe(8_000_000); // 80 000 NOK
    expect(result.sorkystAmountIncVat).toBe(11_900_000); // 119 000 NOK
    expect(result.vatAmount).toBe(2_380_000); // 23 800 NOK
    expect(result.sorkystRevenueExVat).toBe(9_520_000); // 95 200 NOK
  });

  it("keeps the split internally consistent for any quantity", () => {
    for (const quantity of [1, 2, 3, 6, 7, 11, 37, 4_821]) {
      const r = calculateOrderFinancials(quantity, pricing);
      expect(r.clubEarningAmount + r.sorkystAmountIncVat).toBe(r.grossAmount);
      expect(r.vatAmount + r.sorkystRevenueExVat).toBe(r.sorkystAmountIncVat);
      expect(Number.isInteger(r.vatAmount)).toBe(true);
    }
  });

  it("rejects invalid input", () => {
    expect(() => calculateOrderFinancials(0, pricing)).toThrow();
    expect(() => calculateOrderFinancials(1.5, pricing)).toThrow();
    expect(() => validatePricing({ ...pricing, clubEarningPerUnit: 30_000 })).toThrow();
    expect(() => validatePricing({ ...pricing, vatRateBp: 20_000 })).toThrow();
    expect(() => validatePricing({ ...pricing, retailPriceIncVat: 0 })).toThrow();
  });
});

describe("seller and campaign totals", () => {
  it("sums a seller's three orders — Johannes' example", () => {
    const orders = [2, 1, 3].map((q) => calculateOrderFinancials(q, pricing));
    const totals = sumBreakdowns(orders);
    expect(totals.quantity).toBe(6);
    expect(totals.grossAmount).toBe(119_400); // 1 194 NOK
    expect(totals.clubEarningAmount).toBe(48_000); // 480 NOK
  });

  it("aggregates persisted order rows", () => {
    const rows = [
      { quantity: 2, gross_amount: 39_800, club_earning_amount: 16_000, sorkyst_amount_inc_vat: 23_800, vat_amount: 4_760, sorkyst_revenue_ex_vat: 19_040 },
      { quantity: 3, gross_amount: 59_700, club_earning_amount: 24_000, sorkyst_amount_inc_vat: 35_700, vat_amount: 7_140, sorkyst_revenue_ex_vat: 28_560 },
    ];
    const totals = aggregateOrders(rows);
    expect(totals.quantity).toBe(5);
    expect(totals.grossAmount).toBe(99_500);
    expect(totals.clubEarningAmount).toBe(40_000);
    expect(totals.vatAmount).toBe(11_900);
  });

  it("aggregating per order equals computing the total in one go", () => {
    const perOrder = sumBreakdowns([4, 9, 13, 1].map((q) => calculateOrderFinancials(q, pricing)));
    const inOneGo = calculateOrderFinancials(27, pricing);
    expect(perOrder.quantity).toBe(inOneGo.quantity);
    expect(perOrder.grossAmount).toBe(inOneGo.grossAmount);
    expect(perOrder.clubEarningAmount).toBe(inOneGo.clubEarningAmount);
    expect(perOrder.sorkystAmountIncVat).toBe(inOneGo.sorkystAmountIncVat);
  });

  it("computes progress against a target", () => {
    expect(progressPercent(8, 5)).toBe(100);
    expect(progressPercent(0, 5)).toBe(0);
    expect(progressPercent(3, 4)).toBe(75);
    expect(progressPercent(3, 0)).toBe(0);
  });
});
