import { AdminPage, InternalTag, Panel, StatusBadge } from "@/components/admin/ui";
import {
  CALCULATOR_DEFAULTS,
  MAX_ORDER_QUANTITY,
  MIN_ORDER_QUANTITY,
  PRICES_INCLUDE_VAT,
  VAT_RATE,
} from "@/lib/config/pricing";
import { isAdminAuthEnabled } from "@/lib/admin/auth";
import { isLocalAdminStore } from "@/lib/repositories/admin";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Innstillinger" };

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="flex flex-col items-start gap-1 sm:items-end">
        <span className="tabular text-sm text-ink">{value}</span>
        {note ? <span className="text-xs text-ink-faint">{note}</span> : null}
      </dd>
    </div>
  );
}

export default async function SettingsPage() {
  const local = isLocalAdminStore();

  return (
    <AdminPage
      title="Innstillinger"
      lead="Gjeldende konfigurasjon. Verdiene settes i koden og i miljøvariabler."
    >
      <Panel
        title="Drift"
        description="Hvor data lagres, og hva som er sikret."
      >
        <dl className="flex flex-col">
          <Row
            label="Datalagring"
            value={local ? "Lokal (.data/)" : "Supabase"}
            note={
              local
                ? "Demodata seedes ved første oppstart. Slett .data/ for å tilbakestille."
                : "Bestillinger skrives med service role-nøkkelen."
            }
          />
          <Row
            label="Admin-innlogging"
            value={isAdminAuthEnabled() ? "På" : "Av"}
            note={
              isAdminAuthEnabled()
                ? undefined
                : "Alle med lenken kan åpne /admin. Må på før publisering."
            }
          />
        </dl>
        {!isAdminAuthEnabled() ? (
          <p className="mt-4">
            <StatusBadge label="Ikke klar for publisering" tone="warning" />
          </p>
        ) : null}
      </Panel>

      <Panel title="Pris og mva." actions={<InternalTag />}>
        <dl className="flex flex-col">
          <Row label="Mva.-sats" value={formatPercent(VAT_RATE)} />
          <Row
            label="Priser lagres"
            value={PRICES_INCLUDE_VAT ? "Inkl. mva." : "Eks. mva."}
            note="Netto og mva. utledes fra bruttobeløpet ved bestilling."
          />
          <Row
            label="Prisrekkefølge"
            value="Dugnad › organisasjon › volum › standard"
          />
        </dl>
      </Panel>

      <Panel title="Bestilling">
        <dl className="flex flex-col">
          <Row label="Minste bestilling" value={`${formatNumber(MIN_ORDER_QUANTITY)} produkter`} />
          <Row label="Største bestilling" value={`${formatNumber(MAX_ORDER_QUANTITY)} produkter`} />
          <Row
            label="Hurtigvolum"
            value={CALCULATOR_DEFAULTS.quickVolumes.map((v) => formatNumber(v)).join(" · ")}
          />
          <Row
            label="Standard i kalkulatoren"
            value={`${formatNumber(CALCULATOR_DEFAULTS.participants)} deltakere · ${formatNumber(
              CALCULATOR_DEFAULTS.productsPerParticipant,
            )} produkter hver`}
          />
        </dl>
      </Panel>
    </AdminPage>
  );
}
