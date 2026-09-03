import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/guards";
import { getCampaign, getCampaignDetail } from "@/lib/data/club";
import { getCampaignTeams, getClubDetail } from "@/lib/data/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatNumber, formatOre } from "@/lib/money";
import { env } from "@/lib/env";
import { adminNav } from "@/app/admin/nav";
import { CampaignForms } from "./CampaignForms";
import { SellerLinks } from "./SellerLinks";

export const dynamic = "force-dynamic";

export default async function AdminCampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const user = await requireRole(["SORKYST_ADMIN"], `/admin/campaigns/${campaignId}`);

  const data = await getCampaign(campaignId);
  if (!data) notFound();

  const [detail, clubDetail, campaignTeams] = await Promise.all([
    getCampaignDetail(campaignId, null),
    getClubDetail(data.campaign.club_id),
    getCampaignTeams(campaignId),
  ]);

  const supabase = await createServerSupabase();
  const { data: sellerRows } = await supabase
    .from("sellers")
    .select("id, first_name, last_name, slug, seller_code, sales_target, team_id, teams!inner(name, slug, clubs!inner(slug))")
    .eq("campaign_id", campaignId)
    .order("first_name");

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const soldBySeller = new Map(detail.sellers.map((s) => [s.sellerId, s.quantity]));

  const sellers = (sellerRows ?? []).map((s) => {
    const team = one(s.teams as unknown as { name: string; slug: string; clubs: { slug: string } | { slug: string }[] }[]);
    const club = one(team?.clubs as never) as { slug: string } | undefined;
    return {
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      teamName: team?.name ?? "",
      sellerCode: s.seller_code,
      salesTarget: s.sales_target,
      sold: soldBySeller.get(s.id) ?? 0,
      url: `${env.appUrl}/s/${club?.slug ?? ""}/${team?.slug ?? ""}/${s.slug}`,
    };
  });

  return (
    <AppShell
      user={user}
      nav={adminNav}
      active="/admin/clubs"
      title={data.campaign.name}
      subtitle={
        <Link href={`/admin/clubs/${data.campaign.club_id}`} className="hover:underline">
          {data.clubName}
        </Link>
      }
      actions={
        <>
          <CampaignStatusBadge status={data.campaign.status} />
          <Link href={`/club/campaigns/${campaignId}`} className="text-sm text-navy-400 hover:text-navy-900">
            Klubbvisning →
          </Link>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Selgere" value={formatNumber(sellers.length)} />
        <Stat label="Produkter solgt" value={formatNumber(detail.totals.quantity)} />
        <Stat label="Kundesalg" value={formatOre(detail.totals.grossAmount)} />
        <Stat
          label="SØRKYST eks. mva"
          value={formatOre(detail.totals.sorkystRevenueExVat)}
          hint={`mva ${formatOre(detail.totals.vatAmount)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Selgerlenker" subtitle={`${sellers.length} selgere · kopier, last ned eller skriv ut QR`} />
            <SellerLinks sellers={sellers} campaignId={campaignId} />
          </Card>
        </div>

        <CampaignForms
          campaign={data.campaign}
          clubTeams={clubDetail?.teams ?? []}
          selectedTeamIds={campaignTeams.map((t) => t.team_id as string)}
        />
      </div>
    </AppShell>
  );
}
