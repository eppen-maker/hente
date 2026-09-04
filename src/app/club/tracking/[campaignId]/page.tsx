import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Stat } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { allowedTeamIds, requireCampaignAccess } from "@/lib/auth/guards";
import { getCampaign } from "@/lib/data/club";
import { getCampaignTracking } from "@/lib/data/tracking";
import { formatNumber } from "@/lib/money";
import { campaignNav } from "@/app/club/nav";
import { PickupBoard } from "./PickupBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hentestatus" };

/**
 * Who still has goods waiting at the clubhouse.
 *
 * Deliberately not about individual customer deliveries — that is the seller's
 * own business, and lives in the seller dashboard. What the club needs is a
 * list of who has collected and who still has to show up.
 */
export default async function TrackingPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const { user } = await requireCampaignAccess(campaignId);

  const data = await getCampaign(campaignId);
  if (!data) notFound();

  const teamFilter = await allowedTeamIds(user);
  const tracking = await getCampaignTracking(campaignId, teamFilter);
  const { totals } = tracking;

  return (
    <AppShell
      user={user}
      nav={campaignNav(campaignId)}
      active={`/club/tracking/${campaignId}`}
      title="Hentestatus"
      subtitle={`${data.clubName} · ${data.campaign.name}`}
      actions={
        <>
          <ButtonLink href={`/api/campaigns/${campaignId}/export/pickup-status`} size="sm" variant="secondary">
            Last ned liste
          </ButtonLink>
          <ButtonLink href={`/club/pickup/${campaignId}`} size="sm">
            Utleveringsmodus
          </ButtonLink>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Må hente"
          value={formatNumber(totals.sellersWaiting)}
          hint={`${formatNumber(totals.productsWaiting)} produkter står igjen`}
        />
        <Stat
          label="Har hentet"
          value={formatNumber(totals.sellersPickedUp)}
          hint={`${formatNumber(totals.productsPickedUp)} produkter utlevert`}
        />
        <Stat label="Produkter totalt" value={formatNumber(totals.ordered)} hint={`${totals.customers} kunder`} />
        <Stat label="Selgere" value={formatNumber(tracking.sellers.length)} />
      </div>

      <div className="mt-6">
        <PickupBoard campaignId={campaignId} sellers={tracking.sellers} teams={tracking.teams} />
      </div>
    </AppShell>
  );
}
