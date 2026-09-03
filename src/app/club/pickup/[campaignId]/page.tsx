import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { requireCampaignAccess } from "@/lib/auth/guards";
import { getCampaign } from "@/lib/data/club";
import { PickupConsole } from "./PickupConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utlevering" };

/**
 * Clubhouse pickup mode. Deliberately outside the normal dashboard chrome:
 * big targets, one job per screen, usable on a phone in a doorway.
 */
export default async function PickupPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  await requireCampaignAccess(campaignId);

  const data = await getCampaign(campaignId);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-navy-100 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Logo size="sm" href={null} />
          <Link href={`/club/campaigns/${campaignId}`} className="text-sm text-navy-400 hover:text-navy-900">
            Tilbake
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="label">{data.clubName}</p>
        <h1 className="display mt-2 text-3xl">Utlevering</h1>
        <p className="mt-1 text-navy-400">
          {data.campaign.name}
          {data.campaign.pickup_location ? ` · ${data.campaign.pickup_location}` : ""}
        </p>

        <PickupConsole campaignId={campaignId} />
      </main>
    </div>
  );
}
