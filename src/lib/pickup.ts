/**
 * Pure pickup arithmetic: how many products each seller must collect at the
 * clubhouse, and what the warehouse must pack in total. Kept free of database
 * access so it can be tested directly.
 */
export interface PaidOrderLine {
  sellerId: string;
  quantity: number;
  status?: string;
}

export interface PickupRequirement {
  sellerId: string;
  quantity: number;
}

/** Only PAID orders create a pickup obligation. */
export function computePickupRequirements(orders: PaidOrderLine[]): PickupRequirement[] {
  const bySeller = new Map<string, number>();
  for (const order of orders) {
    if (order.status && order.status !== "PAID") continue;
    if (order.quantity <= 0) continue;
    bySeller.set(order.sellerId, (bySeller.get(order.sellerId) ?? 0) + order.quantity);
  }
  return Array.from(bySeller.entries())
    .map(([sellerId, quantity]) => ({ sellerId, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function totalPickupQuantity(requirements: PickupRequirement[]): number {
  return requirements.reduce((total, item) => total + item.quantity, 0);
}

/** A seller is ready for pickup as soon as they have at least one paid product. */
export function pickupStatusFor(expectedQuantity: number, alreadyPickedUp: boolean): "NOT_READY" | "READY" | "PICKED_UP" {
  if (alreadyPickedUp) return "PICKED_UP";
  return expectedQuantity > 0 ? "READY" : "NOT_READY";
}
