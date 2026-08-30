"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import {
  createCampaign,
  updateCampaignStatus,
  updateDelivery,
  updateOrderStatus,
  updateOrganization,
  upsertProduct,
} from "@/lib/repositories/admin";
import type {
  CampaignStatus,
  DeliveryStatus,
  OrderStatus,
  OrganizationStatus,
  PlaceholderTone,
} from "@/types";

/**
 * Admin mutations.
 *
 * Every action goes through `requireAdmin()` first, so wiring up real
 * authentication is a change in one file. Inputs are read from FormData and
 * coerced here — nothing trusts the shape of the request.
 */

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, key: string): string | null {
  return text(form, key) || null;
}

function number(form: FormData, key: string, fallback = 0): number {
  const parsed = Number(text(form, key).replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function changeOrderStatusAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "orderId");
  const status = text(formData, "status") as OrderStatus;
  if (!id || !status) return;

  await updateOrderStatus(id, status, actor);
  revalidatePath("/admin/bestillinger");
  revalidatePath(`/admin/bestillinger/${id}`);
  revalidatePath("/admin/leveranser");
  revalidatePath("/admin");
}

export async function changeCampaignStatusAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "campaignId");
  const status = text(formData, "status") as CampaignStatus;
  if (!id || !status) return;

  await updateCampaignStatus(id, status, actor);
  revalidatePath("/admin/dugnader");
  revalidatePath("/admin");
}

export async function createCampaignAction(formData: FormData) {
  const { actor } = await requireAdmin();

  const organizationId = text(formData, "organizationId");
  const name = text(formData, "name");
  const productId = text(formData, "productId");
  if (!organizationId || !name || !productId) return;

  const consumerPrice = number(formData, "consumerPrice");
  const partnerPrice = number(formData, "partnerPrice");
  // A campaign can never be agreed at a price that loses the club money.
  if (partnerPrice > consumerPrice) return;

  await createCampaign(
    {
      organizationId,
      name,
      productId,
      participants: Math.max(0, Math.round(number(formData, "participants"))),
      targetProfit: optionalNumber(formData, "targetProfit"),
      startDate: optionalText(formData, "startDate"),
      orderDeadline: optionalText(formData, "orderDeadline"),
      deliveryDate: optionalText(formData, "deliveryDate"),
      status: (text(formData, "status") || "draft") as CampaignStatus,
      partnerPrice,
      consumerPrice,
    },
    actor,
  );

  revalidatePath("/admin/dugnader");
  revalidatePath("/admin/priser");
  revalidatePath("/admin");
}

export async function saveProductAction(formData: FormData) {
  const { actor } = await requireAdmin();

  const name = text(formData, "name");
  const sku = text(formData, "sku");
  if (!name || !sku) return;

  const consumerPrice = number(formData, "consumerPrice");
  const defaultPartnerPrice = number(formData, "defaultPartnerPrice");
  if (defaultPartnerPrice > consumerPrice) return;

  await upsertProduct(
    {
      id: optionalText(formData, "productId") ?? undefined,
      name,
      sku,
      description: optionalText(formData, "description"),
      sizeMl: optionalNumber(formData, "sizeMl"),
      consumerPrice,
      defaultPartnerPrice,
      vatRate: number(formData, "vatRate", 0.25),
      active: formData.get("active") === "on" || formData.get("active") === "true",
      tagline: optionalText(formData, "tagline"),
      imageUrl: optionalText(formData, "imageUrl"),
      placeholderTone: (text(formData, "placeholderTone") || "sand") as PlaceholderTone,
      sortOrder: Math.round(number(formData, "sortOrder")),
      landedCostExVat: optionalNumber(formData, "landedCostExVat"),
    },
    actor,
  );

  revalidatePath("/admin/produkter");
  revalidatePath("/admin/priser");
  revalidatePath("/admin");
}

export async function updateDeliveryAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const orderId = text(formData, "orderId");
  if (!orderId) return;

  await updateDelivery(
    orderId,
    {
      status: (text(formData, "status") || "not_planned") as DeliveryStatus,
      confirmedDate: optionalText(formData, "confirmedDate"),
      trackingReference: optionalText(formData, "trackingReference"),
      notes: optionalText(formData, "notes"),
    },
    actor,
  );

  revalidatePath("/admin/leveranser");
  revalidatePath("/admin");
}

export async function saveOrganizationAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "organizationId");
  if (!id) return;

  await updateOrganization(
    id,
    {
      contactName: optionalText(formData, "contactName"),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      address: optionalText(formData, "address"),
      postalCode: optionalText(formData, "postalCode"),
      city: optionalText(formData, "city"),
      organizationNumber: optionalText(formData, "organizationNumber"),
      status: (text(formData, "status") || "lead") as OrganizationStatus,
      internalNotes: optionalText(formData, "internalNotes"),
      nextAction: optionalText(formData, "nextAction"),
      nextActionAt: optionalText(formData, "nextActionAt"),
    },
    actor,
  );

  revalidatePath("/admin/organisasjoner");
  revalidatePath(`/admin/organisasjoner/${id}`);
}
