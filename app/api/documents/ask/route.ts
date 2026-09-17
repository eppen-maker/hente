import { NextResponse } from "next/server";
import { answerFromDocuments } from "@/lib/analysis";
import { readStore } from "@/lib/db";

export async function POST(req: Request) {
  const { companyId, question } = (await req.json()) as { companyId: string; question: string };
  const store = readStore();
  const company = store.companies.find((c) => c.id === companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json(answerFromDocuments(company, question ?? ""));
}
