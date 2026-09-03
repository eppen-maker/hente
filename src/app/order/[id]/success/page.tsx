import { notFound } from "next/navigation";
import { brand } from "@/brand/brand.config";
import { Logo } from "@/components/ui/Logo";
import { formatOre } from "@/lib/money";
import { getOrderConfirmation } from "@/lib/data/public";

export const dynamic = "force-dynamic";
export const metadata = { title: "Takk for støtten" };

export default async function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderConfirmation(id);
  if (!order) notFound();

  const paid = order.status === "PAID";

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-navy-100 bg-white px-5 py-5">
        <div className="mx-auto max-w-lg">
          <Logo size="sm" href={null} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-14">
        {paid ? (
          <>
            <p className="label">{order.clubName} · {order.teamName}</p>
            <h1 className="display mt-3 text-4xl leading-tight">Takk for støtten!</h1>
            <p className="mt-4 text-lg leading-relaxed text-navy-500">
              Du kjøpte {order.quantity} {order.quantity === 1 ? "refill" : "refills"} fra {brand.name} gjennom{" "}
              {order.sellerFirstName}.
            </p>
            <p className="mt-3 leading-relaxed text-navy-500">
              {order.sellerFirstName} leverer varene når dugnaden er ferdig
              {order.pickupLocation ? ` (henting hos ${order.pickupLocation})` : ""}.
            </p>
          </>
        ) : (
          <>
            <h1 className="display text-3xl">Betalingen er ikke fullført</h1>
            <p className="mt-3 text-navy-500">
              Vi har registrert bestillingen din, men har ikke mottatt betaling ennå. Fullfør betalingen i
              betalingsappen, eller prøv igjen fra selgerens lenke.
            </p>
          </>
        )}

        <dl className="card mt-9 divide-y divide-navy-100">
          {[
            ["Produkt", `${brand.product.name} · ${brand.product.volume}`],
            ["Antall", `${order.quantity} stk`],
            ["Totalt", formatOre(order.grossAmount)],
            ["Til laget", formatOre(order.clubEarningAmount)],
            ["Selger", `${order.sellerFirstName} ${order.sellerLastName}`.trim()],
            ["Dugnad", order.campaignName],
            ["Ordrenummer", order.id.slice(0, 8).toUpperCase()],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="text-sm text-navy-400">{label}</dt>
              <dd className="tabular text-right text-sm font-medium text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-center text-xs text-navy-300">
          Spørsmål? Kontakt {brand.supportEmail}
        </p>
      </main>
    </div>
  );
}
