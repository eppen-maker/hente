import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aggregateEconomics, unitEconomics } from "@/lib/admin/economics";
import type { Product } from "@/types";

/**
 * Internal SØR° economics. The worked example throughout:
 * consumer 200 incl VAT, club buys at 120 incl VAT, club keeps 80,
 * our landed cost 42 ex VAT.
 */
const product = {
  vatRate: 0.25,
  landedCostExVat: 42,
} satisfies Pick<Product, "vatRate" | "landedCostExVat">;

const pricing = {
  consumerPrice: 200,
  organizationPrice: 120,
  organizationMargin: 80,
};

describe("unit economics", () => {
  it("derives net figures from VAT-inclusive prices", () => {
    const economics = unitEconomics(product, pricing);

    assert.equal(economics.consumerPriceExVat, 160);
    assert.equal(economics.revenueExVat, 96);
    assert.equal(economics.landedCostExVat, 42);
    assert.equal(economics.grossProfitPerUnit, 54);
    assert.ok(Math.abs((economics.grossMargin ?? 0) - 54 / 96) < 1e-9);
    assert.equal(economics.organizationMargin, 80);
  });

  it("reports no gross profit when the landed cost is unknown", () => {
    const economics = unitEconomics({ vatRate: 0.25, landedCostExVat: null }, pricing);
    assert.equal(economics.landedCostExVat, null);
    assert.equal(economics.grossProfitPerUnit, null);
    assert.equal(economics.grossMargin, null);
    // The club's margin is unaffected by our own cost.
    assert.equal(economics.organizationMargin, 80);
  });

  it("honours a different VAT rate", () => {
    const economics = unitEconomics(
      { vatRate: 0.15, landedCostExVat: 42 },
      pricing,
    );
    assert.equal(economics.revenueExVat, 104.35);
  });
});

describe("aggregate economics", () => {
  const line = {
    quantity: 6_000,
    unitPrice: 120,
    organizationMargin: 80,
    vatRate: 0.25,
    landedCostExVat: 42,
  };

  it("aggregates an order of 6 000 units", () => {
    const totals = aggregateEconomics([line]);

    assert.equal(totals.units, 6_000);
    assert.equal(totals.revenueExVat, 576_000);
    assert.equal(totals.cogs, 252_000);
    assert.equal(totals.grossProfit, 324_000);
    assert.ok(Math.abs((totals.grossMargin ?? 0) - 324_000 / 576_000) < 1e-9);
    assert.equal(totals.organizationProfit, 480_000);
    assert.equal(totals.incomplete, false);
  });

  it("flags the result when a product has no cost, without inflating margin", () => {
    const totals = aggregateEconomics([
      line,
      { ...line, quantity: 1_000, landedCostExVat: null },
    ]);

    assert.equal(totals.units, 7_000);
    assert.equal(totals.incomplete, true);
    // The costed line still contributes; the uncosted one does not invent one.
    assert.equal(totals.cogs, 252_000);
  });

  it("returns zeroes for an empty set", () => {
    const totals = aggregateEconomics([]);
    assert.equal(totals.units, 0);
    assert.equal(totals.revenueExVat, 0);
    assert.equal(totals.cogs, null);
    assert.equal(totals.grossMargin, null);
    assert.equal(totals.incomplete, false);
  });
});
