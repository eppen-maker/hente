import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CampaignLead } from "@/types";

/**
 * Lead persistence.
 *
 * Writes to Supabase when it is configured. Otherwise it appends to a local
 * JSON file so "Start en dugnad" is a working form during development rather
 * than a dead button. The local store is intentionally simple — the CRM will
 * replace it.
 */

const LOCAL_STORE = path.join(process.cwd(), ".data", "leads.json");

export type NewCampaignLead = Omit<CampaignLead, "id" | "createdAt">;

export type LeadStorage = "supabase" | "local";

export interface SaveLeadResult {
  lead: CampaignLead;
  storage: LeadStorage;
}

async function saveLocally(lead: CampaignLead): Promise<void> {
  await mkdir(path.dirname(LOCAL_STORE), { recursive: true });
  let existing: CampaignLead[] = [];
  try {
    const raw = await readFile(LOCAL_STORE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed as CampaignLead[];
  } catch {
    // No store yet — start a new one.
  }
  existing.push(lead);
  await writeFile(LOCAL_STORE, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
}

export async function saveLead(input: NewCampaignLead): Promise<SaveLeadResult> {
  const lead: CampaignLead = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("campaign_leads").insert({
      organization_name: lead.organizationName,
      organization_type: lead.organizationType,
      contact_name: lead.contactName,
      email: lead.email,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      participant_count: lead.participantCount,
      products_per_participant: lead.productsPerParticipant ?? null,
      profit_goal: lead.profitGoal ?? null,
      estimated_products: lead.estimatedProducts ?? null,
      estimated_profit: lead.estimatedProfit ?? null,
      message: lead.message ?? null,
      source: lead.source,
    });

    if (!error) return { lead, storage: "supabase" };

    // Never lose a lead because the database rejected it.
    console.error("Supabase lead insert failed, falling back to local:", error.message);
  }

  await saveLocally(lead);
  return { lead, storage: "local" };
}
