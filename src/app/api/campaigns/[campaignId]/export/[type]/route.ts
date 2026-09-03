import { NextResponse, type NextRequest } from "next/server";
import { requireCampaignAccess } from "@/lib/auth/guards";
import { buildCampaignCsv, isExportType } from "@/lib/data/exports";
import { csvResponseHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** CSV exports. Access is checked before any campaign data is read. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ campaignId: string; type: string }> }) {
  const { campaignId, type } = await params;
  if (!isExportType(type)) return NextResponse.json({ error: "Unknown export type" }, { status: 404 });

  await requireCampaignAccess(campaignId);

  const file = await buildCampaignCsv(campaignId, type);
  if (!file) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  return new NextResponse(file.body, { headers: csvResponseHeaders(file.filename) });
}
