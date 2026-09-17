import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/db";
import { latestYear } from "@/lib/finance";
import type { Investment } from "@/lib/types";

interface Body {
  companyId: string;
  amount: number;
  preMoneyValuation: number;
  date?: string;
  structure: "DIRECT" | "VEHICLE";
  type?: "INITIAL" | "FOLLOW_ON";
  allocations?: { investorId: string; amount: number }[];
  note?: string;
  freezeSnapshot?: boolean;
}

export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  if (!b.companyId || !(b.amount > 0) || !(b.preMoneyValuation > 0))
    return NextResponse.json({ error: "Company, amount and valuation are required" }, { status: 400 });

  const result = mutate((store) => {
    const company = store.companies.find((c) => c.id === b.companyId);
    if (!company) return null;

    const allocations = (b.allocations ?? []).filter((a) => a.amount > 0);
    if (b.structure === "DIRECT") {
      const total = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(total - b.amount) > 1)
        return { error: "Allocations must add up to the investment amount for a direct investment." };
    }

    const ownershipPct = b.amount / (b.preMoneyValuation + b.amount);
    const fy = latestYear(company);
    const investDate = b.date || new Date().toISOString().slice(0, 10);

    const investment: Investment = {
      id: uid("inv"),
      companyId: b.companyId,
      date: investDate,
      amount: b.amount,
      entryValuation: b.preMoneyValuation,
      ownershipPct,
      structure: b.structure,
      allocations: b.structure === "DIRECT" ? allocations : [],
      type: b.type ?? (store.investments.some((i) => i.companyId === b.companyId) ? "FOLLOW_ON" : "INITIAL"),
      instrument: "EQUITY",
      note: b.note,
      snapshot:
        b.freezeSnapshot === false
          ? undefined
          : {
              createdAt: new Date().toISOString(),
              investmentDate: investDate,
              amount: b.amount,
              entryValuation: b.preMoneyValuation,
              ownershipPct,
              revenueAtEntry: fy?.revenue ?? null,
              ebitdaAtEntry: fy?.ebitda ?? null,
              thesisAtEntry: company.thesis.ourText,
              assumptions: structuredClone(company.scenarios),
            },
    };

    store.investments.push(investment);
    if (company.status !== "PORTFOLIO") company.status = "PORTFOLIO";
    if (!company.valuation.entryValuation) company.valuation.entryValuation = b.preMoneyValuation;
    company.timeline.push({
      date: investDate,
      type: investment.type === "FOLLOW_ON" ? "FOLLOW_ON" : "INVESTMENT",
      title: `${investment.type === "FOLLOW_ON" ? "Follow-on investment" : "Investment completed"} — NOK ${b.amount.toLocaleString("nb-NO")}`,
      detail: `${b.structure === "VEHICLE" ? `Through ${store.vehicle.name}` : "Held directly by the investors"} at NOK ${b.preMoneyValuation.toLocaleString("nb-NO")} pre-money.`,
    });

    // Draw the capital down from the vehicle or the investors.
    if (b.structure === "VEHICLE") {
      store.vehicle.availableCapital = Math.max(0, store.vehicle.availableCapital - b.amount);
    }

    return { investment };
  });

  if (!result) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, id: result.investment.id });
}
