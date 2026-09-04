"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/data/audit";
import { parseCsv, pick } from "@/lib/csv";
import { kronerToOre } from "@/lib/money";
import { randomCode, sellerSlug, slugify } from "@/lib/slug";
import { campaignSchema, clubSchema, sellerSchema, teamSchema } from "@/lib/validation";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function adminContext() {
  const user = await requireRole(["SORKYST_ADMIN"], "/admin");
  return { user, supabase: await createServerSupabase() };
}

function formObject(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(Array.from(formData.entries()).map(([k, v]) => [k, typeof v === "string" ? v : v.name]));
}

/** Ensure a slug is unique inside a scope by appending -2, -3, … */
async function uniqueSlug(base: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
  const root = base || "x";
  for (let i = 1; i < 50; i += 1) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${randomCode(4).toLowerCase()}`;
}

// ------------------------------------------------------------------ clubs
export async function createClubAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await adminContext();
  const parsed = clubSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const slug = await uniqueSlug(slugify(parsed.data.slug || parsed.data.name), async (candidate) => {
    const { data } = await supabase.from("clubs").select("id").eq("slug", candidate).maybeSingle();
    return Boolean(data);
  });

  const { data, error } = await supabase
    .from("clubs")
    .insert({
      name: parsed.data.name,
      slug,
      organisation_number: parsed.data.organisationNumber || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
      address: parsed.data.address || null,
      postal_code: parsed.data.postalCode || null,
      city: parsed.data.city || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await recordAudit({ actorProfileId: user.profile.id, action: "club.created", entityType: "club", entityId: data.id });
  revalidatePath("/admin/clubs");
  return { ok: true, data: { id: data.id } };
}

export async function updateClubAction(clubId: string, formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const parsed = clubSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("clubs")
    .update({
      name: parsed.data.name,
      organisation_number: parsed.data.organisationNumber || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
      address: parsed.data.address || null,
      postal_code: parsed.data.postalCode || null,
      city: parsed.data.city || null,
      active: formData.get("active") === "on",
    })
    .eq("id", clubId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({ actorProfileId: user.profile.id, action: "club.updated", entityType: "club", entityId: clubId });
  revalidatePath(`/admin/clubs/${clubId}`);
  return { ok: true };
}

// ------------------------------------------------------------------ teams
export async function createTeamAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const parsed = teamSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const slug = await uniqueSlug(slugify(parsed.data.name), async (candidate) => {
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("club_id", parsed.data.clubId)
      .eq("slug", candidate)
      .maybeSingle();
    return Boolean(data);
  });

  const { error } = await supabase
    .from("teams")
    .insert({ club_id: parsed.data.clubId, name: parsed.data.name, slug, season: parsed.data.season || null });
  if (error) return { ok: false, error: error.message };

  await recordAudit({ actorProfileId: user.profile.id, action: "team.created", entityType: "club", entityId: parsed.data.clubId });
  revalidatePath(`/admin/clubs/${parsed.data.clubId}`);
  return { ok: true };
}

/** CSV columns: name/navn, season/sesong */
export async function importTeamsAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ created: number }>> {
  const { user, supabase } = await adminContext();
  const clubId = z.string().uuid().safeParse(formData.get("clubId"));
  if (!clubId.success) return { ok: false, error: "Ugyldig klubb" };

  const rows = parseCsv(String(formData.get("csv") ?? ""));
  if (!rows.length) return { ok: false, error: "Fant ingen rader i CSV-en" };

  let created = 0;
  for (const row of rows) {
    const name = pick(row, ["name", "navn", "lag", "team"]);
    if (!name) continue;
    const slug = await uniqueSlug(slugify(name), async (candidate) => {
      const { data } = await supabase.from("teams").select("id").eq("club_id", clubId.data).eq("slug", candidate).maybeSingle();
      return Boolean(data);
    });
    const { error } = await supabase
      .from("teams")
      .insert({ club_id: clubId.data, name, slug, season: pick(row, ["season", "sesong"]) || null });
    if (!error) created += 1;
  }

  await recordAudit({
    actorProfileId: user.profile.id,
    action: "team.imported",
    entityType: "club",
    entityId: clubId.data,
    metadata: { created, rows: rows.length },
  });
  revalidatePath(`/admin/clubs/${clubId.data}`);
  return { ok: true, data: { created } };
}

// ------------------------------------------------------------------ campaigns
export async function createCampaignAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { user, supabase } = await adminContext();
  const parsed = campaignSchema.safeParse({
    ...formObject(formData),
    leaderboardEnabled: formData.get("leaderboardEnabled") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const slug = await uniqueSlug(slugify(parsed.data.name), async (candidate) => {
    const { data } = await supabase
      .from("campaigns")
      .select("id")
      .eq("club_id", parsed.data.clubId)
      .eq("slug", candidate)
      .maybeSingle();
    return Boolean(data);
  });

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      club_id: parsed.data.clubId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      start_date: parsed.data.startDate || null,
      end_date: parsed.data.endDate || null,
      sales_target_quantity: parsed.data.salesTargetQuantity,
      sales_target_amount: kronerToOre(parsed.data.salesTargetQuantity * parsed.data.retailPriceKr),
      retail_price_inc_vat: kronerToOre(parsed.data.retailPriceKr),
      club_earning_per_unit: kronerToOre(parsed.data.clubEarningKr),
      vat_rate_bp: Math.round(parsed.data.vatRatePercent * 100),
      pickup_location: parsed.data.pickupLocation || null,
      pickup_date: parsed.data.pickupDate || null,
      leaderboard_enabled: parsed.data.leaderboardEnabled,
      status: "DRAFT",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await recordAudit({ actorProfileId: user.profile.id, action: "campaign.created", entityType: "campaign", entityId: data.id });
  revalidatePath(`/admin/clubs/${parsed.data.clubId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateCampaignAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const campaignId = z.string().uuid().safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { ok: false, error: "Ugyldig dugnad" };

  const parsed = campaignSchema.safeParse({
    ...formObject(formData),
    leaderboardEnabled: formData.get("leaderboardEnabled") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      start_date: parsed.data.startDate || null,
      end_date: parsed.data.endDate || null,
      sales_target_quantity: parsed.data.salesTargetQuantity,
      sales_target_amount: kronerToOre(parsed.data.salesTargetQuantity * parsed.data.retailPriceKr),
      retail_price_inc_vat: kronerToOre(parsed.data.retailPriceKr),
      club_earning_per_unit: kronerToOre(parsed.data.clubEarningKr),
      vat_rate_bp: Math.round(parsed.data.vatRatePercent * 100),
      pickup_location: parsed.data.pickupLocation || null,
      pickup_date: parsed.data.pickupDate || null,
      leaderboard_enabled: parsed.data.leaderboardEnabled,
      status: String(formData.get("status") ?? "DRAFT") as never,
    })
    .eq("id", campaignId.data);
  if (error) return { ok: false, error: error.message };

  await recordAudit({ actorProfileId: user.profile.id, action: "campaign.updated", entityType: "campaign", entityId: campaignId.data });
  revalidatePath(`/admin/campaigns/${campaignId.data}`);
  return { ok: true };
}

export async function setCampaignTeamsAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const campaignId = z.string().uuid().safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { ok: false, error: "Ugyldig dugnad" };

  const teamIds = formData.getAll("teamIds").map(String).filter(Boolean);

  await supabase.from("campaign_teams").delete().eq("campaign_id", campaignId.data);
  if (teamIds.length) {
    const { error } = await supabase
      .from("campaign_teams")
      .insert(teamIds.map((teamId) => ({ campaign_id: campaignId.data, team_id: teamId })));
    if (error) return { ok: false, error: error.message };
  }

  await recordAudit({
    actorProfileId: user.profile.id,
    action: "campaign.teams.set",
    entityType: "campaign",
    entityId: campaignId.data,
    metadata: { teamIds },
  });
  revalidatePath(`/admin/campaigns/${campaignId.data}`);
  return { ok: true };
}

// ------------------------------------------------------------------ sellers
async function insertSeller(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  input: {
    campaignId: string;
    teamId: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    salesTarget: number;
  },
) {
  const slug = await uniqueSlug(sellerSlug(input.firstName, input.lastName), async (candidate) => {
    const { data } = await supabase
      .from("sellers")
      .select("id")
      .eq("campaign_id", input.campaignId)
      .eq("team_id", input.teamId)
      .eq("slug", candidate)
      .maybeSingle();
    return Boolean(data);
  });

  let sellerCode = randomCode(6);
  for (let i = 0; i < 10; i += 1) {
    const { data } = await supabase.from("sellers").select("id").eq("seller_code", sellerCode).maybeSingle();
    if (!data) break;
    sellerCode = randomCode(6);
  }

  return supabase.from("sellers").insert({
    campaign_id: input.campaignId,
    team_id: input.teamId,
    first_name: input.firstName,
    last_name: input.lastName,
    slug,
    phone: input.phone || null,
    email: input.email || null,
    seller_code: sellerCode,
    sales_target: input.salesTarget,
  });
}

export async function createSellerAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const parsed = sellerSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await insertSeller(supabase, {
    campaignId: parsed.data.campaignId,
    teamId: parsed.data.teamId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    salesTarget: parsed.data.salesTarget,
  });
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorProfileId: user.profile.id,
    action: "seller.created",
    entityType: "campaign",
    entityId: parsed.data.campaignId,
  });
  revalidatePath(`/admin/campaigns/${parsed.data.campaignId}`);
  return { ok: true };
}

/** CSV columns: first_name/fornavn, last_name/etternavn, team/lag, phone, email, target/mål */
export async function importSellersAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ created: number; skipped: string[] }>> {
  const { user, supabase } = await adminContext();
  const campaignId = z.string().uuid().safeParse(formData.get("campaignId"));
  if (!campaignId.success) return { ok: false, error: "Ugyldig dugnad" };

  const rows = parseCsv(String(formData.get("csv") ?? ""));
  if (!rows.length) return { ok: false, error: "Fant ingen rader i CSV-en" };

  const { data: campaign } = await supabase.from("campaigns").select("club_id").eq("id", campaignId.data).maybeSingle();
  if (!campaign) return { ok: false, error: "Fant ikke dugnaden" };

  const { data: teams } = await supabase.from("teams").select("id, name, slug").eq("club_id", campaign.club_id);
  const teamByKey = new Map<string, string>();
  for (const team of teams ?? []) {
    teamByKey.set(team.name.toLowerCase(), team.id);
    teamByKey.set(team.slug.toLowerCase(), team.id);
  }

  let created = 0;
  const skipped: string[] = [];

  for (const row of rows) {
    const firstName = pick(row, ["first_name", "fornavn", "firstname"]);
    const lastName = pick(row, ["last_name", "etternavn", "lastname"]);
    const teamId = teamByKey.get(pick(row, ["team", "lag"]).toLowerCase());

    if (!firstName || !lastName || !teamId) {
      skipped.push(`${firstName} ${lastName}`.trim() || "(tom rad)");
      continue;
    }

    const { error } = await insertSeller(supabase, {
      campaignId: campaignId.data,
      teamId,
      firstName,
      lastName,
      phone: pick(row, ["phone", "telefon", "mobil"]),
      email: pick(row, ["email", "e-post", "epost"]),
      salesTarget: Number(pick(row, ["target", "mal", "mål", "sales_target"])) || 0,
    });
    if (error) skipped.push(`${firstName} ${lastName}`);
    else created += 1;
  }

  await recordAudit({
    actorProfileId: user.profile.id,
    action: "seller.imported",
    entityType: "campaign",
    entityId: campaignId.data,
    metadata: { created, skipped: skipped.length },
  });
  revalidatePath(`/admin/campaigns/${campaignId.data}`);
  return { ok: true, data: { created, skipped } };
}

export async function setSellerTargetAction(sellerId: string, target: number, campaignId: string): Promise<ActionResult> {
  const { user, supabase } = await adminContext();
  const { error } = await supabase
    .from("sellers")
    .update({ sales_target: Math.max(0, Math.round(target)) })
    .eq("id", sellerId);
  if (error) return { ok: false, error: error.message };

  await recordAudit({
    actorProfileId: user.profile.id,
    action: "seller.target.set",
    entityType: "seller",
    entityId: sellerId,
    metadata: { target },
  });
  revalidatePath(`/admin/campaigns/${campaignId}`);
  return { ok: true };
}
