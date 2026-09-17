import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";
import { structureThesis } from "@/lib/analysis";
import type { Company, FinancialYear, ScenarioKey } from "@/lib/types";

type Patch = {
  status?: Company["status"];
  thesisText?: string;
  structureThesis?: boolean;
  scenarios?: Partial<Record<ScenarioKey, Partial<Company["scenarios"]["base"]>>>;
  valuation?: Partial<Company["valuation"]>;
  financialYear?: Partial<FinancialYear> & { year: number };
  qualitative?: Partial<Company["qualitative"]>;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const patch = (await req.json()) as Patch;

  const result = mutate((store) => {
    const c = store.companies.find((x) => x.id === id);
    if (!c) return null;
    const now = new Date().toISOString();

    if (patch.status) c.status = patch.status;

    if (typeof patch.thesisText === "string") {
      c.thesis.ourText = patch.thesisText;
      c.thesis.updatedAt = now;
    }

    if (patch.scenarios) {
      for (const key of Object.keys(patch.scenarios) as ScenarioKey[]) {
        Object.assign(c.scenarios[key], patch.scenarios[key]);
      }
    }

    if (patch.valuation) {
      Object.assign(c.valuation, patch.valuation);
      c.valuation.updatedAt = now;
    }

    if (patch.qualitative) Object.assign(c.qualitative, patch.qualitative);

    if (patch.financialYear) {
      const existing = c.financials.find((f) => f.year === patch.financialYear!.year);
      if (existing) Object.assign(existing, patch.financialYear, { updatedAt: now });
      else
        c.financials.push({
          revenue: null,
          ebitda: null,
          operatingProfit: null,
          netIncome: null,
          equity: null,
          totalAssets: null,
          debt: null,
          cash: null,
          employees: null,
          source: "Manual entry",
          period: `FY${patch.financialYear.year}`,
          updatedAt: now,
          ...patch.financialYear,
          year: patch.financialYear.year,
        });
      c.financials.sort((a, b) => a.year - b.year);
    }

    if (patch.structureThesis) {
      c.thesis.structured = structureThesis(c);
    }

    return c;
  });

  if (!result) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ ok: true, company: result });
}
