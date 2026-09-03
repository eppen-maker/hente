import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { ButtonLink } from "@/components/ui/Button";
import { requireCampaignAccess, allowedTeamIds } from "@/lib/auth/guards";
import { buildLeaderboards, getCampaign, getCampaignDetail } from "@/lib/data/club";
import { formatNumber, formatOre } from "@/lib/money";
import { campaignNav } from "@/app/club/nav";
import { SellerTable } from "./SellerTable";
import { CloseCampaignPanel } from "./CloseCampaignPanel";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const { user } = await requireCampaignAccess(campaignId);

  const data = await getCampaign(campaignId);
  if (!data) notFound();

  const teamFilter = await allowedTeamIds(user);
  const detail = await getCampaignDetail(campaignId, teamFilter);
  const { campaign, clubName } = data;
  const leaderboards = campaign.leaderboard_enabled ? buildLeaderboards(detail.sellers, detail.teams) : null;

  return (
    <AppShell
      user={user}
      nav={campaignNav(campaignId)}
      active={`/club/campaigns/${campaignId}`}
      title={campaign.name}
      subtitle={`${clubName} · ${campaign.pickup_location ?? "Hentested ikke satt"}`}
      actions={
        <>
          <CampaignStatusBadge status={campaign.status} />
          <ButtonLink href={`/club/pickup/${campaignId}`} size="sm" variant="secondary">
            Utleveringsmodus
          </ButtonLink>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Produkter solgt" value={formatNumber(detail.totals.quantity)} hint={`${detail.orderCount} betalte ordrer`} />
        <Stat label="Kundesalg" value={formatOre(detail.totals.grossAmount)} />
        <Stat label="Til klubben" value={formatOre(detail.totals.clubEarningAmount)} />
        <Stat label="Venter på henting" value={formatNumber(detail.awaitingPickup)} hint="produkter" />
      </div>

      {campaign.sales_target_quantity > 0 ? (
        <Card className="mt-4 px-5 py-5">
          <p className="label">Mål for dugnaden</p>
          <Progress className="mt-3" current={detail.totals.quantity} target={campaign.sales_target_quantity} />
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Lag" subtitle={`${detail.teams.length} lag i dugnaden`} />
          <ul className="divide-y divide-navy-100">
            {detail.teams.map((team) => (
              <li key={team.teamId} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <Link
                    href={`/club/campaigns/${campaignId}?team=${team.teamId}`}
                    className="font-medium text-navy-900 hover:underline"
                  >
                    {team.teamName}
                  </Link>
                  <p className="text-sm text-navy-400">{team.sellerCount} selgere</p>
                </div>
                <div className="text-right">
                  <p className="tabular font-medium">{formatNumber(team.quantity)} solgt</p>
                  <p className="tabular text-sm text-navy-400">{formatOre(team.clubEarning)}</p>
                </div>
              </li>
            ))}
            {!detail.teams.length ? <li className="px-5 py-6 text-sm text-navy-400">Ingen lag registrert.</li> : null}
          </ul>
        </Card>

        <div className="xl:col-span-2">
          <SellerTable rows={detail.sellers} teams={detail.teams} />
        </div>
      </div>

      {leaderboards ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Toppselgere" />
            <ol className="divide-y divide-navy-100">
              {leaderboards.topSellers.map((seller, index) => (
                <li key={seller.sellerId} className="flex items-center gap-4 px-5 py-3">
                  <span className="tabular w-6 text-navy-300">{index + 1}</span>
                  <span className="flex-1 font-medium text-navy-900">{seller.name}</span>
                  <span className="text-sm text-navy-400">{seller.teamName}</span>
                  <span className="tabular w-14 text-right font-medium">{seller.quantity}</span>
                </li>
              ))}
              {!leaderboards.topSellers.length ? <li className="px-5 py-6 text-sm text-navy-400">Ingen salg ennå.</li> : null}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Topplag" />
            <ol className="divide-y divide-navy-100">
              {leaderboards.topTeams.map((team, index) => (
                <li key={team.teamId} className="flex items-center gap-4 px-5 py-3">
                  <span className="tabular w-6 text-navy-300">{index + 1}</span>
                  <span className="flex-1 font-medium text-navy-900">{team.teamName}</span>
                  <span className="tabular w-14 text-right font-medium">{team.quantity}</span>
                </li>
              ))}
              {!leaderboards.topTeams.length ? <li className="px-5 py-6 text-sm text-navy-400">Ingen salg ennå.</li> : null}
            </ol>
          </Card>
        </div>
      ) : null}

      <div className="mt-8">
        <CloseCampaignPanel campaignId={campaignId} status={campaign.status} totalQuantity={detail.totals.quantity} />
      </div>
    </AppShell>
  );
}
