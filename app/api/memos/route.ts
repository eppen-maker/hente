import { NextResponse } from "next/server";
import { generateMemo } from "@/lib/memo";
import { mutate, readStore, uid } from "@/lib/db";

export async function POST(req: Request) {
  const { companyId } = (await req.json()) as { companyId: string };
  const store = readStore();
  const company = store.companies.find((c) => c.id === companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = generateMemo(store, company);
  const memo = {
    id: uid("memo"),
    companyId,
    title: `Investment memo — ${company.name}`,
    createdAt: new Date().toISOString(),
    body,
  };
  mutate((s) => s.memos.unshift(memo));
  return NextResponse.json({ ok: true, id: memo.id });
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  mutate((s) => {
    s.memos = s.memos.filter((m) => m.id !== id);
  });
  return NextResponse.json({ ok: true });
}
