import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateOrder } from "@/lib/calc/order";
import { resolveProductPricing, splitVat } from "@/lib/config/pricing";
import { validateOrderInput } from "@/lib/validation/order";
import { DEMO_PRODUCTS, DEMO_CAMPAIGN_PRICING } from "@/lib/data/demo";
import type { CampaignPricing, PricingTier, Product } from "@/types";

const product = DEMO_PRODUCTS[0] as Product;

describe("order pricing", () => {
  it("uses the product default when there is no campaign agreement", () => {
    const pricing = resolveProductPricing({ product, quantity: 6_000 });
    assert.equal(pricing.consumerPrice, 200);
    assert.equal(pricing.organizationPrice, 120);
    assert.equal(pricing.organizationMargin, 80);
    assert.equal(pricing.fromCampaignAgreement, false);
  });

  it("prefers the campaign's agreed price", () => {
    const agreement: CampaignPricing = {
      id: "test",
      campaignId: "test",
      productId: product.id,
      partnerPrice: 110,
      consumerPrice: 210,
      organizationMargin: 100,
    };
    const pricing = resolveProductPricing({
      product,
      campaignPricing: agreement,
      quantity: 6_000,
    });
    assert.equal(pricing.consumerPrice, 210);
    assert.equal(pricing.organizationPrice, 110);
    assert.equal(pricing.organizationMargin, 100);
    assert.equal(pricing.fromCampaignAgreement, true);
  });

  it("applies a configured volume tier, and only within its band", () => {
    const tiers: PricingTier[] = [
      { minQuantity: 3_000, maxQuantity: 4_999, organizationPrice: 118 },
      { minQuantity: 5_000, maxQuantity: 9_999, organizationPrice: 115 },
      { minQuantity: 10_000, organizationPrice: 112 },
    ];

    assert.equal(
      resolveProductPricing({ product, volumeTiers: tiers, quantity: 1_000 })
        .organizationPrice,
      120,
      "below the first tier the default applies",
    );
    assert.equal(
      resolveProductPricing({ product, volumeTiers: tiers, quantity: 4_000 })
        .organizationPrice,
      118,
    );
    assert.equal(
      resolveProductPricing({ product, volumeTiers: tiers, quantity: 6_000 })
        .organizationPrice,
      115,
    );
    assert.equal(
      resolveProductPricing({ product, volumeTiers: tiers, quantity: 25_000 })
        .organizationPrice,
      112,
    );
  });

  it("never lets a tier raise the agreed price", () => {
    const agreement = DEMO_CAMPAIGN_PRICING[0] as CampaignPricing;
    const pricing = resolveProductPricing({
      product,
      campaignPricing: agreement,
      volumeTiers: [{ minQuantity: 0, organizationPrice: 140 }],
      quantity: 6_000,
    });
    assert.equal(pricing.organizationPrice, 120);
  });
});

describe("VAT", () => {
  it("extracts VAT from a gross amount", () => {
    const { net, vat, gross } = splitVat(720_000, 0.25);
    assert.equal(net, 576_000);
    assert.equal(vat, 144_000);
    assert.equal(gross, 720_000);
    assert.equal(net + vat, gross);
  });
});

describe("calculateOrder", () => {
  it("computes a 6 000 product order for 600 participants", () => {
    const order = calculateOrder({
      product,
      quantity: 6_000,
      participants: 600,
    });

    assert.equal(order.quantity, 6_000);
    assert.equal(order.productsPerParticipant, 10);
    assert.equal(order.organizationProfit, 480_000);
    assert.equal(order.totalConsumerValue, 1_200_000);
    assert.equal(order.total, 720_000);
    assert.equal(order.subtotal, 576_000);
    assert.equal(order.vat, 144_000);
    assert.equal(order.subtotal + order.vat, order.total);
    assert.equal(order.profitPerParticipant, 800);
  });

  it("computes a 10 000 product order", () => {
    const order = calculateOrder({ product, quantity: 10_000, participants: 600 });
    assert.equal(order.organizationProfit, 800_000);
    assert.equal(order.total, 1_200_000);
    assert.equal(order.subtotal, 960_000);
    assert.equal(order.vat, 240_000);
    assert.equal(order.productsPerParticipant, 17);
  });

  it("computes a custom quantity", () => {
    const order = calculateOrder({ product, quantity: 3_750, participants: 250 });
    assert.equal(order.organizationProfit, 300_000);
    assert.equal(order.total, 450_000);
    assert.equal(order.productsPerParticipant, 15);
  });

  it("cannot produce a negative or fractional order", () => {
    const order = calculateOrder({ product, quantity: -50, participants: -3 });
    assert.equal(order.quantity, 0);
    assert.equal(order.participants, 0);
    assert.equal(order.total, 0);
    assert.equal(order.organizationProfit, 0);
    assert.equal(order.productsPerParticipant, 0);

    const fractional = calculateOrder({ product, quantity: 100.9, participants: 10.7 });
    assert.equal(fractional.quantity, 100);
    assert.equal(fractional.participants, 10);
  });
});

describe("order validation", () => {
  const valid = {
    organizationName: "Søgne FK",
    contactName: "Ingrid Solheim",
    email: "ingrid@sognefk.no",
    participants: 600,
    quantity: 6_000,
  };

  it("accepts a well-formed order", () => {
    const result = validateOrderInput(valid);
    assert.equal(result.ok, true);
    assert.equal(result.data?.quantity, 6_000);
    assert.equal(result.data?.goalMode, "per-participant");
  });

  it("rejects a malformed email", () => {
    const result = validateOrderInput({ ...valid, email: "ingrid@klubben" });
    assert.equal(result.ok, false);
    assert.equal(result.errors.email, "Skriv inn en gyldig e-postadresse.");
  });

  it("rejects zero participants and negative quantities", () => {
    assert.equal(validateOrderInput({ ...valid, participants: 0 }).ok, false);
    assert.equal(validateOrderInput({ ...valid, quantity: -100 }).ok, false);
    assert.equal(validateOrderInput({ ...valid, quantity: 0 }).ok, false);
  });

  it("rejects an order below the minimum", () => {
    const result = validateOrderInput({ ...valid, quantity: 100 });
    assert.equal(result.ok, false);
    assert.match(result.errors.quantity ?? "", /Minste bestilling/);
  });

  it("rejects fractional quantities and participants", () => {
    assert.equal(validateOrderInput({ ...valid, quantity: 6_000.5 }).ok, false);
    assert.equal(validateOrderInput({ ...valid, participants: 12.3 }).ok, false);
  });

  it("strips client-supplied pricing so it can never reach an order", () => {
    const result = validateOrderInput({
      ...valid,
      unitPrice: 1,
      consumerPrice: 9_999,
      organizationMargin: 9_999,
      organizationProfit: 9_999_999,
      total: 1,
      subtotal: 1,
      vat: 0,
    });

    assert.equal(result.ok, true);
    const data = result.data as Record<string, unknown>;
    for (const key of [
      "unitPrice",
      "consumerPrice",
      "organizationMargin",
      "organizationProfit",
      "total",
      "subtotal",
      "vat",
    ]) {
      assert.equal(data[key], undefined, `${key} must not survive validation`);
    }
  });

  it("validates an organization number when one is given", () => {
    assert.equal(validateOrderInput({ ...valid, organizationNumber: "12345678" }).ok, false);
    assert.equal(validateOrderInput({ ...valid, organizationNumber: "912345678" }).ok, true);
    assert.equal(validateOrderInput({ ...valid, organizationNumber: "" }).ok, true);
  });
});
