"use client";

import { useState } from "react";
import { ActionForm, Field, Select, TextArea } from "@/components/ActionForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createSellerAction,
  importSellersAction,
  setCampaignTeamsAction,
  updateCampaignAction,
} from "@/app/admin/actions";
import type { Campaign, Team } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Utkast" },
  { value: "ACTIVE", label: "Aktiv" },
  { value: "CLOSED", label: "Stengt" },
  { value: "PICKUP", label: "Utlevering" },
  { value: "COMPLETED", label: "Fullført" },
];

export function CampaignForms({
  campaign,
  clubTeams,
  selectedTeamIds,
}: {
  campaign: Campaign;
  clubTeams: Team[];
  selectedTeamIds: string[];
}) {
  const [tab, setTab] = useState<"settings" | "teams" | "sellers">("settings");
  const teamOptions = clubTeams.filter((team) => selectedTeamIds.includes(team.id));

  return (
    <Card className="h-fit">
      <CardHeader
        title="Administrer dugnad"
        action={
          <div className="flex gap-1">
            {(
              [
                ["settings", "Innstillinger"],
                ["teams", "Lag"],
                ["sellers", "Selgere"],
              ] as const
            ).map(([key, label]) => (
              <Button key={key} size="sm" variant={tab === key ? "primary" : "secondary"} onClick={() => setTab(key)}>
                {label}
              </Button>
            ))}
          </div>
        }
      />

      {tab === "settings" ? (
        <ActionForm action={updateCampaignAction} submitLabel="Lagre dugnad" successMessage="Dugnaden er lagret." className="px-5 py-5">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="clubId" value={campaign.club_id} />
          <div className="space-y-4">
            <Field label="Navn" name="name" defaultValue={campaign.name} required />
            <Field label="Beskrivelse" name="description" defaultValue={campaign.description} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" name="startDate" type="date" defaultValue={campaign.start_date} />
              <Field label="Slutt" name="endDate" type="date" defaultValue={campaign.end_date} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Pris (kr)" name="retailPriceKr" type="number" step="0.01" defaultValue={campaign.retail_price_inc_vat / 100} />
              <Field label="Til klubb (kr)" name="clubEarningKr" type="number" step="0.01" defaultValue={campaign.club_earning_per_unit / 100} />
              <Field label="Mva (%)" name="vatRatePercent" type="number" step="0.1" defaultValue={campaign.vat_rate_bp / 100} />
            </div>
            <Field label="Salgsmål (antall)" name="salesTargetQuantity" type="number" defaultValue={campaign.sales_target_quantity} />
            <Field label="Hentested" name="pickupLocation" defaultValue={campaign.pickup_location} />
            <Field label="Hentedato" name="pickupDate" type="date" defaultValue={campaign.pickup_date} />
              <Select
                label="Betaling"
                name="paymentMode"
                options={[
                  { value: "ONLINE", label: "Kunden betaler online (Vipps)" },
                  { value: "INVOICE", label: "Klubben faktureres — kunden betaler ikke her" },
                ]}
                defaultValue={campaign.payment_mode}
              />
            <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={campaign.status} />
            <Select
              label="Toppliste"
              name="leaderboardEnabled"
              options={[
                { value: "on", label: "På" },
                { value: "", label: "Av" },
              ]}
              defaultValue={campaign.leaderboard_enabled ? "on" : ""}
            />
          </div>
        </ActionForm>
      ) : null}

      {tab === "teams" ? (
        <ActionForm action={setCampaignTeamsAction} submitLabel="Lagre lag" successMessage="Lagene er oppdatert." className="px-5 py-5">
          <input type="hidden" name="campaignId" value={campaign.id} />
          <p className="label">Lag som deltar</p>
          <ul className="mt-3 space-y-2">
            {clubTeams.map((team) => (
              <li key={team.id}>
                <label className="flex items-center gap-2.5 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    name="teamIds"
                    value={team.id}
                    defaultChecked={selectedTeamIds.includes(team.id)}
                    className="h-4 w-4 accent-navy-900"
                  />
                  {team.name}
                </label>
              </li>
            ))}
            {!clubTeams.length ? <li className="text-sm text-navy-400">Klubben har ingen lag ennå.</li> : null}
          </ul>
        </ActionForm>
      ) : null}

      {tab === "sellers" ? (
        <div className="space-y-8 px-5 py-5">
          <ActionForm action={createSellerAction} submitLabel="Legg til selger" successMessage="Selgeren er opprettet.">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <div className="space-y-4">
              <Select
                label="Lag"
                name="teamId"
                options={(teamOptions.length ? teamOptions : clubTeams).map((team) => ({ value: team.id, label: team.name }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fornavn" name="firstName" required />
                <Field label="Etternavn" name="lastName" required />
              </div>
              <Field label="Telefon" name="phone" />
              <Field label="E-post" name="email" type="email" />
              <Field label="Salgsmål" name="salesTarget" type="number" defaultValue={0} />
            </div>
          </ActionForm>

          <div className="border-t border-navy-100 pt-6">
            <ActionForm
              action={importSellersAction}
              submitLabel="Importer selgere"
              successMessage={(data) => {
                const result = data as { created: number; skipped: string[] } | undefined;
                return `Importerte ${result?.created ?? 0} selgere${
                  result?.skipped.length ? `, hoppet over ${result.skipped.length}` : ""
                }.`;
              }}
            >
              <input type="hidden" name="campaignId" value={campaign.id} />
              <TextArea
                label="CSV — fornavn, etternavn, lag, telefon, e-post, mål"
                name="csv"
                rows={7}
                placeholder={"fornavn;etternavn;lag;telefon;epost;mal\nJohannes;Hansen;G2013;90000000;;5"}
              />
            </ActionForm>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
