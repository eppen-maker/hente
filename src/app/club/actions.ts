"use server";

import { revalidatePath } from "next/cache";
import { requireCampaignAccess } from "@/lib/auth/guards";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/data/audit";
import { closeCampaign, setCampaignStatus } from "@/lib/data/campaigns";
import { confirmPickup, PickupError, searchPickupCandidates, undoPickup } from "@/lib/data/pickup";

export async function closeCampaignAction(campaignId: string) {
  const { user } = await requireCampaignAccess(campaignId);
  const result = await closeCampaign(campaignId, user.profile.id);
  revalidatePath(`/club/campaigns/${campaignId}`);
  revalidatePath("/club");
  return { ok: true as const, result };
}

export async function completeCampaignAction(campaignId: string) {
  const { user } = await requireCampaignAccess(campaignId);
  await setCampaignStatus(campaignId, "COMPLETED", user.profile.id);
  revalidatePath(`/club/campaigns/${campaignId}`);
  return { ok: true as const };
}

export async function confirmPickupAction(campaignId: string, sellerId: string, quantity: number) {
  const { user } = await requireCampaignAccess(campaignId);
  try {
    const { pickedUpAt } = await confirmPickup({ sellerId, quantity });
    revalidatePath(`/club/pickup/${campaignId}`);
    revalidatePath(`/club/tracking/${campaignId}`);
    revalidatePath(`/club/campaigns/${campaignId}`);
    return { ok: true as const, pickedUpAt, confirmedBy: `${user.profile.first_name} ${user.profile.last_name}`.trim() };
  } catch (error) {
    if (error instanceof PickupError) {
      return { ok: false as const, code: error.code, message: error.message, pickedUpAt: error.pickedUpAt ?? null };
    }
    throw error;
  }
}

export async function searchPickupAction(campaignId: string, query: string) {
  await requireCampaignAccess(campaignId);
  const candidates = await searchPickupCandidates(campaignId, query);
  return { ok: true as const, candidates };
}

export async function undoPickupAction(campaignId: string, sellerId: string) {
  await requireCampaignAccess(campaignId);
  try {
    await undoPickup(sellerId);
    revalidatePath(`/club/pickup/${campaignId}`);
    revalidatePath(`/club/tracking/${campaignId}`);
    revalidatePath(`/club/campaigns/${campaignId}`);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof PickupError) return { ok: false as const, message: error.message };
    throw error;
  }
}

/**
 * Ticks a single customer order as delivered from the club side.
 * The RLS policy `order_deliveries_update_club` is the enforcing check.
 */
export async function setOrderDeliveredAction(campaignId: string, orderId: string, delivered: boolean) {
  const { user } = await requireCampaignAccess(campaignId);
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

  if (error || !data) return { ok: false as const, message: "Kunne ikke oppdatere leveringen." };

  await recordAudit({
    actorProfileId: user.profile.id,
    action: delivered ? "delivery.delivered" : "delivery.reverted",
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath(`/club/tracking/${campaignId}`);
  return { ok: true as const };
}
