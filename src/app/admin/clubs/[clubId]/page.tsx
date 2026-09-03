import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/guards";
import { getClubDetail } from "@/lib/data/admin";
import { formatOre } from "@/lib/money";
import { adminNav } from "@/app/admin/nav";
import { ClubForms } from "./ClubForms";

export const dynamic = "force-dynamic";

export default async function AdminClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await requireRole(["SORKYST_ADMIN"], `/admin/clubs/${clubId}`);
  const detail = await getClubDetail(clubId);
  if (!detail) notFound();

  return (
    <AppShell
      user={user}
      nav={adminNav}
      active="/admin/clubs"
      title={detail.club.name}
      subtitle={`/${detail.club.slug} · ${detail.teams.length} lag · ${detail.campaigns.length} dugnader`}
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Dugnader" />
            <ul className="divide-y divide-navy-100">
              {detail.campaigns.map((campaign) => (
                <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <Link href={`/admin/campaigns/${campaign.id}`} className="font-medium text-navy-900 hover:underline">
                      {campaign.name}
                    </Link>
                    <p className="tabular mt-0.5 text-sm text-navy-400">
                      {formatOre(campaign.retail_price_inc_vat)} · {formatOre(campaign.club_earning_per_unit)} til klubb ·{" "}
                      {campaign.vat_rate_bp / 100} % mva
                    </p>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </li>
              ))}
              {!detail.campaigns.length ? (
                <li className="px-5 py-8 text-center text-sm text-navy-400">Ingen dugnader ennå.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Lag" subtitle={`${detail.teams.length} registrert`} />
            <ul className="divide-y divide-navy-100">
              {detail.teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between px-5 py-3">
                  <span className="font-medium text-navy-900">{team.name}</span>
                  <span className="text-sm text-navy-300">
                    /{team.slug} {team.season ? `· ${team.season}` : ""}
                  </span>
                </li>
              ))}
              {!detail.teams.length ? <li className="px-5 py-8 text-center text-sm text-navy-400">Ingen lag ennå.</li> : null}
            </ul>
          </Card>
        </div>

        <ClubForms club={detail.club} />
      </div>
    </AppShell>
  );
}
