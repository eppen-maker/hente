import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, Stat } from "@/components/ui/Card";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { requireRole } from "@/lib/auth/guards";
import { getAccessibleClubs, getClubCampaigns } from "@/lib/data/club";
import { formatOre, formatNumber } from "@/lib/money";
import { clubNav } from "./nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klubb" };

export default async function ClubPage() {
  const user = await requireRole(["SORKYST_ADMIN", "CLUB_ADMIN", "TEAM_ADMIN"], "/club");
  const clubs = await getAccessibleClubs();

  const sections = await Promise.all(
    clubs.map(async (club) => ({ club, campaigns: await getClubCampaigns(club.id) })),
  );

  return (
    <AppShell
      user={user}
      nav={clubNav}
      active="/club"
      title="Dugnadsoversikt"
      subtitle={clubs.length === 1 ? clubs[0].name : `${clubs.length} klubber`}
    >
      {!sections.length ? (
        <Card className="px-6 py-10 text-center text-navy-500">
          Kontoen din er ikke koblet til en klubb ennå. Ta kontakt med SØRKYST.
        </Card>
      ) : null}

      {sections.map(({ club, campaigns }) => (
        <section key={club.id} className="mb-12">
          {sections.length > 1 ? <h2 className="display mb-4 text-xl">{club.name}</h2> : null}

          {!campaigns.length ? (
            <Card className="px-6 py-8 text-center text-navy-400">Ingen dugnader registrert for {club.name}.</Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            {campaigns.map(({ campaign, totals, sellerCount, orderCount }) => (
              <Card key={campaign.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/club/campaigns/${campaign.id}`} className="display text-xl hover:underline">
                      {campaign.name}
                    </Link>
                    <p className="mt-1 text-sm text-navy-400">
                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString("nb-NO") : "—"} –{" "}
                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("nb-NO") : "—"}
                    </p>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    ["Selgere", formatNumber(sellerCount)],
                    ["Produkter solgt", formatNumber(totals.quantity)],
                    ["Kundesalg", formatOre(totals.grossAmount)],
                    ["Opptjent til klubben", formatOre(totals.clubEarningAmount)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="label">{label}</dt>
                      <dd className="tabular mt-1 text-lg font-medium text-navy-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {campaign.sales_target_quantity > 0 ? (
                  <Progress className="mt-5" current={totals.quantity} target={campaign.sales_target_quantity} />
                ) : null}

                <div className="mt-5 flex flex-wrap gap-4 border-t border-navy-100 pt-4 text-sm">
                  <Link href={`/club/campaigns/${campaign.id}`} className="font-medium text-navy-900 hover:underline">
                    Se lag og selgere
                  </Link>
                  <Link href={`/club/pickup/${campaign.id}`} className="text-navy-400 hover:text-navy-900">
                    Utleveringsmodus
                  </Link>
                  <span className="ml-auto text-navy-300">{orderCount} betalte ordrer</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {sections.length === 1 && sections[0].campaigns.length ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Totalt solgt"
            value={formatNumber(sections[0].campaigns.reduce((n, c) => n + c.totals.quantity, 0))}
            hint="alle dugnader"
          />
          <Stat
            label="Totalt kundesalg"
            value={formatOre(sections[0].campaigns.reduce((n, c) => n + c.totals.grossAmount, 0))}
          />
          <Stat
            label="Totalt til klubben"
            value={formatOre(sections[0].campaigns.reduce((n, c) => n + c.totals.clubEarningAmount, 0))}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
