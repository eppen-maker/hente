import { AdminPage, EmptyState, KpiCard, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { leadStats, listLeads } from "@/lib/repositories/admin";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/validation/lead";
import { formatCurrency, formatNumber } from "@/lib/format";

export const metadata = { title: "Henvendelser" };

const SOURCE_LABELS: Record<string, string> = {
  calculator: "Kalkulatoren",
  homepage: "Forsiden",
  contact: "Kontaktskjema",
  campaign: "Dugnadslenke",
  unknown: "Ukjent",
};

function formatDateTime(value: string): string {
  const [date, time] = value.replace("T", " ").split(" ");
  if (!date) return value;
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}${time ? ` ${time.slice(0, 5)}` : ""}`;
}

export default async function LeadsPage() {
  const [leads, stats] = await Promise.all([listLeads(), leadStats()]);

  return (
    <AdminPage
      title="Henvendelser"
      lead="Klubber som har tatt kontakt gjennom «Start en dugnad» eller kontaktskjemaet."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Henvendelser totalt" value={formatNumber(stats.total)} />
        <KpiCard label="Siste sju dager" value={formatNumber(stats.lastWeek)} />
        <KpiCard
          label="Anslått potensial"
          value={formatCurrency(stats.potential)}
          sub="til klubbene, hvis alle blir dugnad"
          emphasis
        />
      </div>

      <Panel padding={false}>
        {leads.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Ingen henvendelser ennå"
              body="Alt som sendes inn fra «Start en dugnad» eller kontaktskjemaet dukker opp her."
            />
          </div>
        ) : (
          <Table minWidth="76rem">
            <thead>
              <tr>
                <Th>Mottatt</Th>
                <Th>Organisasjon</Th>
                <Th>Kontakt</Th>
                <Th align="right">Deltakere</Th>
                <Th align="right">Anslag produkter</Th>
                <Th align="right">Anslag til klubben</Th>
                <Th>Kom fra</Th>
                <Th>Melding</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <Td>{formatDateTime(lead.createdAt)}</Td>
                  <Td>
                    <span className="text-ink">{lead.organizationName}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {ORGANIZATION_TYPE_LABELS[lead.organizationType] ?? lead.organizationType}
                      {lead.city ? ` · ${lead.city}` : ""}
                    </span>
                  </Td>
                  <Td>
                    {lead.contactName}
                    <span className="mt-0.5 block text-xs">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
                      >
                        {lead.email}
                      </a>
                    </span>
                    {lead.phone ? (
                      <span className="block text-xs text-ink-faint">{lead.phone}</span>
                    ) : null}
                  </Td>
                  <Td align="right">{formatNumber(lead.participantCount)}</Td>
                  <Td align="right">
                    {lead.estimatedProducts ? formatNumber(lead.estimatedProducts) : "—"}
                  </Td>
                  <Td align="right">
                    {lead.estimatedProfit ? formatCurrency(lead.estimatedProfit) : "—"}
                  </Td>
                  <Td>
                    <StatusBadge
                      label={SOURCE_LABELS[lead.source] ?? lead.source}
                      tone="neutral"
                    />
                  </Td>
                  <Td className="max-w-xs">
                    {lead.message ? (
                      <span className="block text-sm leading-relaxed text-ink-muted">
                        {lead.message}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
