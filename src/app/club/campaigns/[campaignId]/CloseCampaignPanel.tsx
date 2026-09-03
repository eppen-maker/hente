"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatOre } from "@/lib/money";
import { closeCampaignAction, completeCampaignAction } from "@/app/club/actions";
import type { CampaignStatus } from "@/lib/types";
import type { CloseCampaignResult } from "@/lib/data/campaigns";

const EXPORTS = [
  { type: "packing-list", label: "Pakkeliste for lager" },
  { type: "delivery-list", label: "Leveringsliste til kunder" },
  { type: "settlement", label: "Økonomisk oppgjør" },
] as const;

export function CloseCampaignPanel({
  campaignId,
  status,
  totalQuantity,
}: {
  campaignId: string;
  status: CampaignStatus;
  totalQuantity: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CloseCampaignResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canClose = status === "ACTIVE" || status === "CLOSED";
  const canComplete = status === "PICKUP";

  return (
    <Card>
      <CardHeader
        title="Avslutning og eksport"
        subtitle="Stenger for nye ordrer, beregner hentebehov og oppretter hentekoder per selger."
      />

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
        <div>
          <p className="label">Totalt produktbehov</p>
          <p className="display tabular mt-2 text-4xl">{formatNumber(result?.totalQuantity ?? totalQuantity)}</p>
          <p className="mt-1 text-sm text-navy-400">produkter som skal pakkes og hentes</p>

          {result ? (
            <div className="mt-4 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Dugnaden er avsluttet. {formatNumber(result.pickupsCreated)} hentekoder opprettet ·{" "}
              {formatNumber(result.sellersWithProducts)} selgere med varer · {formatOre(result.clubEarning)} til klubben.
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {canClose ? (
              confirming ? (
                <>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const response = await closeCampaignAction(campaignId);
                        setResult(response.result);
                        setConfirming(false);
                      })
                    }
                  >
                    {pending ? "Avslutter…" : "Ja, avslutt dugnaden"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                    Avbryt
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setConfirming(true)}>
                  Avslutt dugnaden
                </Button>
              )
            ) : null}

            {canComplete ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => startTransition(async () => void (await completeCampaignAction(campaignId)))}
              >
                {pending ? "Lagrer…" : "Marker som fullført"}
              </Button>
            ) : null}
          </div>
        </div>

        <div>
          <p className="label">Nedlastinger</p>
          <ul className="mt-3 space-y-2">
            {EXPORTS.map((item) => (
              <li key={item.type}>
                <a
                  href={`/api/campaigns/${campaignId}/export/${item.type}`}
                  className="flex items-center justify-between rounded-sm border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 transition hover:border-navy-900"
                >
                  {item.label}
                  <span className="text-navy-300">CSV ↓</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
