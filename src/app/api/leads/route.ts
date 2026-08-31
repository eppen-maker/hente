import { NextResponse } from "next/server";

import { notifyNewLead } from "@/lib/notifications/notify";
import { saveLead } from "@/lib/repositories/leads";
import { validateLead } from "@/lib/validation/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Very small in-memory throttle — enough to stop accidental double posts. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "For mange forsøk. Prøv igjen om et minutt." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  const result = validateLead(payload);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { ok: false, message: "Sjekk feltene under.", errors: result.errors },
      { status: 422 },
    );
  }

  try {
    const { lead, storage } = await saveLead(result.data);

    // Same rule as orders: an enquiry nobody is told about is an enquiry
    // nobody answers.
    await notifyNewLead({
      organizationName: lead.organizationName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      participantCount: lead.participantCount,
      estimatedProducts: lead.estimatedProducts ?? null,
      estimatedProfit: lead.estimatedProfit ?? null,
      message: lead.message ?? null,
      source: lead.source,
    });

    return NextResponse.json({ ok: true, id: lead.id, storage }, { status: 201 });
  } catch (error) {
    console.error("Failed to save lead:", error);
    return NextResponse.json(
      { ok: false, message: "Noe gikk galt hos oss. Prøv igjen, eller send oss en e-post." },
      { status: 500 },
    );
  }
}
