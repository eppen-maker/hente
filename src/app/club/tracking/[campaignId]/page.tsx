import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Stat } from "@/components/ui/Card";
import { allowedTeamIds, requireCampaignAccess } from "@/lib/auth/guards";
import { getCampaign } from "@/lib/data/club";
import { getCampaignTracking } from "@/lib/data/tracking";
import { formatNumber } from "@/lib/money";
import { campaignNav } from "@/app/club/nav";
import { TrackingBoard } from "./TrackingBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sporing" };

export default async function TrackingPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const { user } = await requireCampaignAccess(campaignId);

  const data = await getCampaign(campaignId);
  if (!data) notFound();

  const teamFilter = await allowedTeamIds(user);
  const tracking = await getCampaignTracking(campaignId, teamFilter);

  return (
    <AppShell
      user={user}
      nav={campaignNav(campaignId)}
      active={`/club/tracking/${campaignId}`}
      title="Sporing"
      subtitle={`${data.clubName} · ${data.campaign.name}`}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Bestilt" value={formatNumber(tracking.totals.ordered)} hint={`${tracking.totals.customers} kunder`} />
        <Stat label="Utlevert" value={formatNumber(tracking.totals.delivered)} />
        <Stat label="Gjenstår" value={formatNumber(tracking.totals.remaining)} />
        <Stat
          label="Selgere hentet"
          value={`${formatNumber(tracking.totals.sellersPickedUp)} / ${formatNumber(tracking.sellers.length)}`}
          hint={`${tracking.totals.sellersReady} klare`}
        />
      </div>

      <div className="mt-6">
        <TrackingBoard campaignId={campaignId} sellers={tracking.sellers} teams={tracking.teams} />
      </div>
    </AppShell>
  );
}
