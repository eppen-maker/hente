"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/data/audit";

/**
 * Sellers mark their own customer orders as delivered.
 * The update runs through the user-scoped client, so the RLS policy
 * `order_deliveries_update` (owns_seller) is the enforcing check.
 */
export async function setDeliveryStatus(orderId: string, delivered: boolean) {
  const user = await requireUser("/seller");
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("order_deliveries")
    .update({
      status: delivered ? "DELIVERED" : "NOT_DELIVERED",
      delivered_at: delivered ? new Date().toISOString() : null,
    })
    .eq("order_id", orderId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false as const, error: "Kunne ikke oppdatere leveringen." };

  await recordAudit({
    actorProfileId: user.profile.id,
    action: delivered ? "delivery.delivered" : "delivery.reverted",
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath("/seller");
  return { ok: true as const };
}
