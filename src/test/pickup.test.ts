import { describe, expect, it } from "vitest";
import { computePickupRequirements, pickupStatusFor, totalPickupQuantity } from "@/lib/pickup";

describe("pickup quantities", () => {
  it("sums a seller's paid orders — Johannes collects 6", () => {
    const requirements = computePickupRequirements([
      { sellerId: "johannes", quantity: 2, status: "PAID" },
      { sellerId: "johannes", quantity: 1, status: "PAID" },
      { sellerId: "johannes", quantity: 3, status: "PAID" },
    ]);
    expect(requirements).toEqual([{ sellerId: "johannes", quantity: 6 }]);
    expect(totalPickupQuantity(requirements)).toBe(6);
  });

  it("ignores unpaid, cancelled and refunded orders", () => {
    const requirements = computePickupRequirements([
      { sellerId: "a", quantity: 5, status: "PAID" },
      { sellerId: "a", quantity: 4, status: "PENDING" },
      { sellerId: "a", quantity: 3, status: "CANCELLED" },
      { sellerId: "a", quantity: 2, status: "REFUNDED" },
    ]);
    expect(requirements).toEqual([{ sellerId: "a", quantity: 5 }]);
  });

  it("splits across sellers and totals the warehouse requirement", () => {
    const requirements = computePickupRequirements([
      { sellerId: "a", quantity: 6, status: "PAID" },
      { sellerId: "b", quantity: 11, status: "PAID" },
      { sellerId: "c", quantity: 1, status: "PAID" },
    ]);
    expect(requirements[0]).toEqual({ sellerId: "b", quantity: 11 });
    expect(totalPickupQuantity(requirements)).toBe(18);
  });

  it("has no requirement for a seller without sales", () => {
    expect(computePickupRequirements([])).toEqual([]);
    expect(totalPickupQuantity([])).toBe(0);
  });

  it("derives pickup status", () => {
    expect(pickupStatusFor(0, false)).toBe("NOT_READY");
    expect(pickupStatusFor(6, false)).toBe("READY");
    expect(pickupStatusFor(6, true)).toBe("PICKED_UP");
  });
});
