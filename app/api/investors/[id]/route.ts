import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";
import type { Investor } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const patch = (await req.json()) as Partial<Investor>;
  const updated = mutate((store) => {
    const i = store.investors.find((x) => x.id === id);
    if (!i) return null;
    Object.assign(i, patch, { id: i.id });
    return i;
  });
  if (!updated) return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  return NextResponse.json({ ok: true, investor: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = mutate((store) => {
    const used = store.investments.some((inv) => inv.allocations.some((a) => a.investorId === id));
    const inVehicle = (store.investors.find((x) => x.id === id)?.vehicleOwnership ?? 0) > 0;
    if (used || inVehicle) return false;
    store.investors = store.investors.filter((x) => x.id !== id);
    return true;
  });
  if (!ok)
    return NextResponse.json(
      { error: "Investor has capital allocated to investments or owns part of the vehicle and cannot be removed." },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
