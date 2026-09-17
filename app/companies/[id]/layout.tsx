import Link from "next/link";
import { notFound } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { Logo, Pill, StatusBadge } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date, nok, pct } from "@/lib/format";
import { buildPosition } from "@/lib/portfolio";
import { GenerateMemoButton } from "./MemoButton";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "financials", label: "Financial history" },
  { slug: "analysis", label: "Analysis" },
  { slug: "thesis", label: "Investment thesis" },
  { slug: "valuation", label: "Valuation" },
  { slug: "scenarios", label: "Scenarios" },
  { slug: "captable", label: "Cap table" },
  { slug: "timeline", label: "Timeline" },
  { slug: "documents", label: "Documents" },
  { slug: "memo", label: "Memos" },
];

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();
  const position = buildPosition(company, store.investments);

  return (
    <>
      <div className="flex items-start justify-between gap-8 mb-6">
        <div className="flex items-start gap-4">
          <Logo text={company.logoText} color={company.logoColor} size={52} />
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] leading-none">{company.name}</h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-[13px] text-ink-2 max-w-3xl leading-relaxed">{company.description || "No description registered."}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Pill>{company.sector}</Pill>
              <Pill muted>{company.industry}</Pill>
              <Pill muted>{company.location}</Pill>
              <Pill muted>{company.listing === "LISTED" ? "Listed" : "Unlisted"}</Pill>
              {company.orgNr ? <Pill muted>Org.nr {company.orgNr}</Pill> : null}
              {company.ticker ? <Pill muted>{company.ticker}</Pill> : null}
              {company.foundedYear ? <Pill muted>Founded {company.foundedYear}</Pill> : null}
              {company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="text-[11px] text-ink-3 underline hover:text-ink">
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {position.invested > 0 ? (
            <>
              <div className="label">Our position</div>
              <div className="num text-[19px] mt-1.5">{nok(position.invested)}</div>
              <div className="text-[11px] text-ink-3 mt-1">
                {pct(position.ownership, 2)} ownership · {position.structures.includes("VEHICLE") ? store.vehicle.name : "Direct"}
              </div>
              <div className="text-[11px] text-ink-3">Current value {nok(position.currentValue)}</div>
            </>
          ) : (
            <>
              <div className="label">No position</div>
              <div className="text-[11px] text-ink-3 mt-1.5">Last updated {date(company.valuation.updatedAt)}</div>
              <Link href={`/allocate?company=${company.id}`} className="inline-block mt-2 text-[12px] underline">
                Model an investment →
              </Link>
            </>
          )}
          <div className="mt-3">
            <GenerateMemoButton companyId={company.id} />
          </div>
        </div>
      </div>

      <Tabs base={`/companies/${company.id}`} items={TABS} />
      {children}
    </>
  );
}
