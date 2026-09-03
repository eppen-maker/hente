"use server";

import { revalidatePath } from "next/cache";
import { requireCampaignAccess } from "@/lib/auth/guards";
import { closeCampaign, setCampaignStatus } from "@/lib/data/campaigns";
import { confirmPickup, PickupError, searchPickupCandidates } from "@/lib/data/pickup";

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
    const { pickedUpAt } = await confirmPickup({
      campaignId,
      sellerId,
      quantity,
      confirmedByProfileId: user.profile.id,
    });
    revalidatePath(`/club/pickup/${campaignId}`);
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
