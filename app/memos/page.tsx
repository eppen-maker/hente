import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date } from "@/lib/format";

export default async function MemosPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const store = readStore();
  const selected = store.memos.find((m) => m.id === id) ?? store.memos[0];

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Investment memos"
        subtitle="Each memo is a frozen snapshot of what the system knew when it was generated. Generate a new one from any company page."
      />

      {store.memos.length === 0 ? (
        <Card>
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            No memos generated yet. Open a company and press{" "}
            <span className="text-ink">Generate investment memo</span> — the memo is written from the registered financials,
            our thesis, our scenario assumptions and the known gaps, and is then stored as a snapshot.
          </p>
          <div className="mt-3">
            <Link href="/companies" className="text-[12px] underline">
              Go to companies →
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <SectionTitle title="Snapshots" hint={`${store.memos.length} saved`} />
            <div className="space-y-2">
              {store.memos.map((m) => {
                const company = store.companies.find((c) => c.id === m.companyId);
                const active = selected?.id === m.id;
                return (
                  <Link
                    key={m.id}
                    href={`/memos?id=${m.id}`}
                    className={`block border rounded-[3px] p-3 ${active ? "border-[color:var(--accent)]" : "border-[color:var(--line)] hover:border-[color:var(--ink-3)]"}`}
                  >
                    <div className="text-[12.5px]">{company?.name ?? m.companyId}</div>
                    <div className="text-[10.5px] text-ink-3 mt-1">{date(m.createdAt)}</div>
                  </Link>
                );
              })}
            </div>
          </Card>
          <div className="col-span-3">
            <Card>
              {selected ? <Markdown source={selected.body} /> : null}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
