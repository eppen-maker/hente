import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/db";
import type { CompanyDocument } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as {
    companyId: string;
    name: string;
    type: CompanyDocument["type"];
    period: string;
    pages?: number | null;
  };
  if (!b.companyId || !b.name?.trim()) return NextResponse.json({ error: "Company and file name are required" }, { status: 400 });

  const doc: CompanyDocument = {
    id: uid("doc"),
    name: b.name.trim(),
    type: b.type ?? "ANNUAL_REPORT",
    period: b.period?.trim() || "—",
    uploadedAt: new Date().toISOString(),
    pages: b.pages ?? null,
    extracts: [],
  };

  const ok = mutate((store) => {
    const c = store.companies.find((x) => x.id === b.companyId);
    if (!c) return false;
    c.documents.unshift(doc);
    return true;
  });

  if (!ok) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: doc.id });
}
