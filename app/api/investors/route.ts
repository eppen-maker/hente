import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/db";
import type { Investor } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, string>;
  if (!b.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const n = (v: string | undefined) => (v === undefined || v === "" ? 0 : Number(v) || 0);

  const investor: Investor = {
    id: uid("inv"),
    name: b.name.trim(),
    role: b.role?.trim() || "Investor",
    email: b.email?.trim() || null,
    joinedAt: new Date().toISOString().slice(0, 10),
    availableCapital: n(b.availableCapital),
    committedCapital: n(b.committedCapital),
    vehicleOwnership: n(b.vehicleOwnership) / 100,
    vehicleEquityContribution: n(b.vehicleEquityContribution),
    vehicleShareholderLoan: n(b.vehicleShareholderLoan),
  };

  mutate((store) => store.investors.push(investor));
  return NextResponse.json({ id: investor.id });
}
