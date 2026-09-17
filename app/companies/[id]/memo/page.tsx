import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Card, SectionTitle } from "@/components/ui";
import { readStore } from "@/lib/db";
import { date } from "@/lib/format";
import { generateMemo } from "@/lib/memo";
import { GenerateMemoButton } from "../MemoButton";

export default async function MemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = readStore();
  const company = store.companies.find((c) => c.id === id);
  if (!company) notFound();

  const memos = store.memos.filter((m) => m.companyId === company.id);
  const preview = generateMemo(store, company);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-3">
        <Card>
          <SectionTitle
            title={memos.length ? memos[0].title : "Investment memo (live preview)"}
            hint={
              memos.length
                ? `Saved snapshot from ${date(memos[0].createdAt)} — frozen, it does not change when the data changes.`
                : "Generated live from current data. Press Generate investment memo to freeze it as a snapshot."
            }
          />
          <div className="mt-4">
            <Markdown source={memos.length ? memos[0].body : preview} />
          </div>
        </Card>
      </div>

      <div>
        <Card>
          <SectionTitle title="Saved snapshots" hint="Each memo is frozen at generation time" />
          <div className="mb-4">
            <GenerateMemoButton companyId={company.id} />
          </div>
          <div className="space-y-2.5">
            {memos.length ? (
              memos.map((m, i) => (
                <div key={m.id} className="border border-[color:var(--line)] rounded-[3px] p-3">
                  <div className="text-[12px]">{i === 0 ? "Latest" : `Snapshot ${memos.length - i}`}</div>
                  <div className="text-[10.5px] text-ink-3 mt-1">{date(m.createdAt)}</div>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-ink-3">No snapshots saved yet.</div>
            )}
          </div>
          <p className="text-[11px] text-ink-3 leading-relaxed mt-5 pt-4 border-t border-[color:var(--line)]">
            A memo restates what is registered in the system: reported financials with their sources, our thesis in our own
            words, our scenario assumptions and the gaps we have not filled. It contains no figure that is not in the data.
          </p>
        </Card>
      </div>
    </div>
  );
}
