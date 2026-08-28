import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateProductsPerParticipant,
  calculateProfit,
  calculateRequiredProducts,
  projectFromProductsPerParticipant,
  projectFromProfitGoal,
  projectFromTotalProducts,
  recommendVolume,
} from "@/lib/calc/fundraising";
import { resolvePricing } from "@/lib/config/pricing";
import { formatCurrency, formatNumber, parseNumberInput } from "@/lib/format";

const NBSP = " ";

describe("pricing", () => {
  it("derives the organization margin from the price list", () => {
    const pricing = resolvePricing();
    assert.equal(pricing.consumerPrice, 200);
    assert.equal(pricing.organizationPrice, 120);
    assert.equal(pricing.organizationMargin, 80);
    assert.equal(pricing.marginRate, 0.4);
  });

  it("applies volume tiers when a tiered price list is used", () => {
    const flat = resolvePricing({ pricingId: "pricing-volume-2026", quantity: 1_000 });
    const tiered = resolvePricing({ pricingId: "pricing-volume-2026", quantity: 12_000 });
    assert.equal(flat.organizationMargin, 80);
    assert.equal(tiered.organizationPrice, 115);
    assert.equal(tiered.organizationMargin, 85);
  });
});

describe("mode A — products per participant", () => {
  it("matches the reference example: 600 participants x 10 products", () => {
    const projection = projectFromProductsPerParticipant({
      participants: 600,
      productsPerParticipant: 10,
    });

    assert.equal(projection.totalProducts, 6_000);
    assert.equal(projection.organizationProfit, 480_000);
    assert.equal(projection.totalConsumerSales, 1_200_000);
    assert.equal(projection.totalOrganizationCost, 720_000);
    assert.equal(projection.profitPerParticipant, 800);
    assert.equal(projection.roundedUp, false);
  });

  it("computes profit straight from the resolved margin", () => {
    const pricing = resolvePricing();
    assert.equal(calculateProfit({ totalProducts: 6_000, pricing }), 480_000);
    assert.equal(calculateProfit({ totalProducts: 0, pricing }), 0);
  });
});

describe("mode B — profit goal", () => {
  it("matches the reference example: 500 000 kr across 600 participants", () => {
    const projection = projectFromProfitGoal({ participants: 600, profitGoal: 500_000 });

    assert.equal(projection.productsPerParticipant, 11);
    assert.equal(projection.totalProducts, 6_600);
    assert.equal(projection.organizationProfit, 528_000);
    assert.equal(projection.roundedUp, true);
    assert.equal(projection.profitGoal, 500_000);
  });

  it("always rounds products per participant up to a whole product", () => {
    assert.equal(calculateRequiredProducts(500_000, 80), 6_250);
    assert.equal(calculateProductsPerParticipant(6_250, 600), 11);
    // An exact fit is not rounded further.
    assert.equal(calculateProductsPerParticipant(6_000, 600), 10);
  });

  it("never lands below the goal", () => {
    for (const goal of [10_000, 123_456, 500_000, 999_999]) {
      for (const participants of [1, 17, 95, 600, 1_000]) {
        const projection = projectFromProfitGoal({ participants, profitGoal: goal });
        assert.ok(
          projection.organizationProfit >= goal,
          `goal ${goal} with ${participants} participants fell short`,
        );
      }
    }
  });

  it("guards against a zero participant count", () => {
    const projection = projectFromProfitGoal({ participants: 0, profitGoal: 100_000 });
    assert.equal(projection.participants, 1);
    assert.ok(projection.organizationProfit >= 100_000);
  });
});

describe("quick volumes", () => {
  it("spreads a fixed volume across the current participants", () => {
    const projection = projectFromTotalProducts({ participants: 600, totalProducts: 10_000 });
    assert.equal(projection.productsPerParticipant, 17);
    assert.equal(projection.organizationProfit, 800_000);
  });

  it("recommends the volume closest to the default effort level", () => {
    const volumes = [3_000, 5_000, 6_000, 10_000, 15_000];
    assert.equal(recommendVolume(600, volumes, 10), 6_000);
    assert.equal(recommendVolume(300, volumes, 10), 3_000);
    assert.equal(recommendVolume(1_400, volumes, 10), 15_000);
    assert.equal(recommendVolume(0, volumes, 10), null);
  });
});

describe("formatting", () => {
  it("groups thousands the Norwegian way", () => {
    assert.equal(formatNumber(6_000), `6${NBSP}000`);
    assert.equal(formatNumber(1_200_000), `1${NBSP}200${NBSP}000`);
    assert.equal(formatNumber(999), "999");
    assert.equal(formatCurrency(480_000), `480${NBSP}000${NBSP}kr`);
  });

  it("parses grouped input back to a number", () => {
    assert.equal(parseNumberInput(`6${NBSP}000`), 6_000);
    assert.equal(parseNumberInput("6 000"), 6_000);
    assert.equal(parseNumberInput("6.000"), 6_000);
    assert.equal(parseNumberInput(""), null);
    assert.equal(parseNumberInput("abc"), null);
  });
});
