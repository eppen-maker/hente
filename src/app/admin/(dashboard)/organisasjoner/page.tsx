import { Search } from "lucide-react";

import {
  AdminPage,
  EmptyState,
  Panel,
  RowLink,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { cn } from "@/components/ui/cn";
import { campaignStatus, organizationStatus } from "@/lib/admin/status";
import { organizationSummaries } from "@/lib/admin/stats";
import { formatCurrency, formatNumber } from "@/lib/format";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "Organisasjoner" };

const FILTERS = [
  { value: "alle", label: "Alle" },
  { value: "aktive", label: "Aktive" },
  { value: "lead", label: "Leads" },
  { value: "planlegger", label: "Planlegger" },
  { value: "aktiv-dugnad", label: "Aktiv dugnad" },
  { value: "fullfort", label: "Fullført" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = String(params.q ?? "").trim().toLowerCase();
  const filter = (String(params.filter ?? "alle") as FilterValue) ?? "alle";

  const all = await organizationSummaries();

  const rows = all.filter((summary) => {
    const { organization, activeCampaign } = summary;

    if (query) {
      const haystack = [
        organization.name,
        organization.contactName,
        organization.email,
        organization.city,
        organization.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    switch (filter) {
      case "aktive":
        return organization.status === "active";
      case "lead":
        return organization.status === "lead";
      case "planlegger":
        return activeCampaign?.status === "draft" || activeCampaign?.status === "planned";
      case "aktiv-dugnad":
        return activeCampaign?.status === "active";
      case "fullfort":
        return summary.campaignCount > 0 && activeCampaign === null;
      default:
        return true;
    }
  });

  const buildHref = (next: Partial<{ q: string; filter: string }>) => {
    const search = new URLSearchParams();
    const q = next.q ?? query;
    const f = next.filter ?? filter;
    if (q) search.set("q", q);
    if (f && f !== "alle") search.set("filter", f);
    const suffix = search.toString();
    return (suffix ? `/admin/organisasjoner?${suffix}` : "/admin/organisasjoner") as Route;
  };

  return (
    <AdminPage
      title="Organisasjoner"
      lead={`${formatNumber(all.length)} organisasjoner i basen.`}
    >
      <div className="flex flex-col gap-4">
        <form method="get" className="flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.5}
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Søk på navn, kontakt eller sted"
              aria-label="Søk"
              className="w-full rounded-lg border border-line bg-surface py-2.5 pr-4 pl-9 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          {filter !== "alle" ? <input type="hidden" name="filter" value={filter} /> : null}
          <button
            type="submit"
            className="rounded-md border border-line-strong px-4 py-2.5 text-sm text-ink transition-colors hover:border-ink"
          >
            Søk
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Link
              key={item.value}
              href={buildHref({ filter: item.value })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                filter === item.value
                  ? "border-ink bg-ink text-canvas"
                  : "border-line-strong text-ink-muted hover:border-ink hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Panel padding={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Ingen treff"
              body="Juster søket eller filteret for å se flere organisasjoner."
            />
          </div>
        ) : (
          <Table minWidth="72rem">
            <thead>
              <tr>
                <Th>Organisasjon</Th>
                <Th>Kontaktperson</Th>
                <Th align="right">Deltakere</Th>
                <Th>Aktiv dugnad</Th>
                <Th align="right">Totalt volum</Th>
                <Th align="right">Omsetning</Th>
                <Th>Status</Th>
                <Th>Neste handling</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((summary) => {
                const { organization, activeCampaign } = summary;
                const status = organizationStatus(organization.status);
                return (
                  <tr key={organization.id}>
                    <Td>
                      <RowLink href={`/admin/organisasjoner/${organization.id}`}>
                        {organization.name}
                      </RowLink>
                      {organization.city ? (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {organization.city}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {organization.contactName ?? "—"}
                      {organization.email ? (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {organization.email}
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right">
                      {activeCampaign ? formatNumber(activeCampaign.participants) : "—"}
                    </Td>
                    <Td>
                      {activeCampaign ? (
                        <>
                          <span className="block text-ink">{activeCampaign.name}</span>
                          <span className="mt-1 inline-block">
                            <StatusBadge
                              label={campaignStatus(activeCampaign.status).label}
                              tone={campaignStatus(activeCampaign.status).tone}
                            />
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-faint">Ingen</span>
                      )}
                    </Td>
                    <Td align="right">{formatNumber(summary.totalUnits)}</Td>
                    <Td align="right">{formatCurrency(summary.totalOrderValue)}</Td>
                    <Td>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </Td>
                    <Td>{summary.nextAction ?? "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
