import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";

export async function PUT(req: Request) {
  const b = (await req.json()) as { totalCapital: number; positions: { companyId: string; amount: number }[] };
  mutate((store) => {
    store.lab = {
      totalCapital: Number(b.totalCapital) || 0,
      positions: (b.positions ?? []).filter((p) => p.companyId && p.amount >= 0),
      updatedAt: new Date().toISOString(),
    };
  });
  return NextResponse.json({ ok: true });
}
