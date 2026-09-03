import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/guards";
import { getAdminMetrics } from "@/lib/data/admin";
import { formatNumber, formatOre } from "@/lib/money";
import { adminNav } from "./nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "SØRKYST admin" };

export default async function AdminPage() {
  const user = await requireRole(["SORKYST_ADMIN"], "/admin");
  const metrics = await getAdminMetrics();

  return (
    <AppShell user={user} nav={adminNav} active="/admin" title="SØRKYST" subtitle="Alle klubber og dugnader">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktive klubber" value={formatNumber(metrics.activeClubs)} />
        <Stat label="Aktive dugnader" value={formatNumber(metrics.activeCampaigns)} />
        <Stat label="Aktive selgere" value={formatNumber(metrics.activeSellers)} />
        <Stat label="Produkter solgt" value={formatNumber(metrics.totals.quantity)} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Kundesalg (brutto)" value={formatOre(metrics.totals.grossAmount)} />
        <Stat
          label="SØRKYST eks. mva"
          value={formatOre(metrics.totals.sorkystRevenueExVat)}
          hint={`mva ${formatOre(metrics.totals.vatAmount)}`}
        />
        <Stat label="Opptjent av klubbene" value={formatOre(metrics.totals.clubEarningAmount)} />
        <Stat label="Venter på henting" value={formatNumber(metrics.productsAwaitingPickup)} hint="produkter" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Klubbtoppliste" subtitle="Solgte produkter" />
          <ol className="divide-y divide-navy-100">
            {metrics.clubLeaderboard.map((club, index) => (
              <li key={club.clubId} className="flex items-center gap-4 px-5 py-3.5">
                <span className="tabular w-6 text-navy-300">{index + 1}</span>
                <Link href={`/admin/clubs/${club.clubId}`} className="flex-1 font-medium text-navy-900 hover:underline">
                  {club.clubName}
                </Link>
                <span className="tabular text-sm text-navy-400">{formatOre(club.clubEarning)}</span>
                <span className="tabular w-20 text-right font-medium">{formatNumber(club.quantity)} solgt</span>
              </li>
            ))}
            {!metrics.clubLeaderboard.length ? <li className="px-5 py-8 text-sm text-navy-400">Ingen salg ennå.</li> : null}
          </ol>
        </Card>

        <Card>
          <CardHeader title="Økonomi" subtitle="Alle betalte ordrer" />
          <dl className="divide-y divide-navy-100">
            {[
              ["Produkter solgt", formatNumber(metrics.totals.quantity)],
              ["Kundesalg inkl. mva", formatOre(metrics.totals.grossAmount)],
              ["Opptjent av klubbene", formatOre(metrics.totals.clubEarningAmount)],
              ["SØRKYST inkl. mva", formatOre(metrics.totals.sorkystAmountIncVat)],
              ["Herav mva", formatOre(metrics.totals.vatAmount)],
              ["SØRKYST eks. mva", formatOre(metrics.totals.sorkystRevenueExVat)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between px-5 py-3">
                <dt className="text-sm text-navy-500">{label}</dt>
                <dd className="tabular font-medium text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}
