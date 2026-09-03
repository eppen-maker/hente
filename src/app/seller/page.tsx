import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { Badge, PickupStatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { ShareLink } from "@/components/ShareLink";
import { requireUser } from "@/lib/auth/guards";
import { getSellerDashboard, getSellerRecordsForProfile } from "@/lib/data/seller";
import { formatOre } from "@/lib/money";
import { env } from "@/lib/env";
import { DeliveryList } from "./DeliveryList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Min dugnad" };

export default async function SellerPage({ searchParams }: { searchParams: Promise<{ seller?: string }> }) {
  const { seller: sellerParam } = await searchParams;
  const user = await requireUser("/seller");
  const records = await getSellerRecordsForProfile(user.profile.id);

  if (!records.length) {
    return (
      <AppShell user={user} nav={[{ href: "/seller", label: "Min dugnad" }]} active="/seller" width="narrow">
        <Card className="px-6 py-10 text-center">
          <h1 className="display text-2xl">Ingen dugnad ennå</h1>
          <p className="mx-auto mt-3 max-w-md text-navy-500">
            Kontoen din er ikke koblet til en selger. Be klubben din om å legge deg til i dugnaden, så dukker salget ditt
            opp her.
          </p>
        </Card>
      </AppShell>
    );
  }

  const active = records.find((r) => r.id === sellerParam) ?? records[0];
  const dashboard = await getSellerDashboard(active.id, env.appUrl);

  if (!dashboard) {
    return (
      <AppShell user={user} nav={[{ href: "/seller", label: "Min dugnad" }]} active="/seller" width="narrow">
        <Card className="px-6 py-10 text-center text-navy-500">Fant ikke dugnaden din.</Card>
      </AppShell>
    );
  }

  const { seller, campaign, totals, orders, pickup } = dashboard;
  const targetReached = seller.sales_target > 0 && totals.quantity >= seller.sales_target;
  const toPickUp = pickup?.expected_quantity ?? totals.quantity;

  return (
    <AppShell user={user} nav={[{ href: "/seller", label: "Min dugnad" }]} active="/seller" width="narrow">
      <section>
        <h1 className="display text-3xl">Hei {seller.first_name} 👋</h1>
        <p className="mt-1.5 text-navy-400">
          {dashboard.clubName} {dashboard.teamName} · {campaign.name}
        </p>
      </section>

      <Card className="mt-6 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <p className="label">Ditt salg</p>
          {targetReached ? <Badge variant="positive">Mål nådd 🎉</Badge> : null}
        </div>
        <Progress className="mt-4" current={totals.quantity} target={seller.sales_target} />
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Produkter solgt" value={totals.quantity} />
        <Stat label="Til laget" value={formatOre(totals.clubEarningAmount)} />
        <Stat label="Kunder" value={dashboard.customerCount} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="mt-4">
        <ShareLink url={dashboard.shareUrl} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Henting i klubbhuset" subtitle={campaign.pickup_location ?? "Sted annonseres senere"} />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="label">Totalt å hente</p>
            <p className="display tabular mt-1 text-3xl">{toPickUp} produkter</p>
          </div>
          <PickupStatusBadge status={pickup?.status ?? "NOT_READY"} />
        </div>

        {pickup?.status === "READY" ? (
          <div className="border-t border-navy-100 px-5 py-5">
            <p className="label">Vis denne koden ved henting</p>
            <p className="display mt-2 text-3xl tracking-[0.2em]">{pickup.pickup_code}</p>
            <img
              src={`/api/qr?data=${encodeURIComponent(pickup.pickup_code)}&size=384`}
              alt="QR-kode for henting"
              width={160}
              height={160}
              className="mt-4 rounded-sm border border-navy-100"
            />
          </div>
        ) : null}

        {pickup?.status === "PICKED_UP" && pickup.picked_up_at ? (
          <div className="border-t border-navy-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Hentet {new Date(pickup.picked_up_at).toLocaleString("nb-NO")} · {pickup.actual_quantity ?? toPickUp} produkter
          </div>
        ) : null}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Kundene dine" subtitle="Merk av når du har levert varene" />
        <DeliveryList orders={orders} />
      </Card>
    </AppShell>
  );
}
