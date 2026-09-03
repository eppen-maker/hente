"use client";

import { useState } from "react";
import { ActionForm, Checkbox, Field, Select, TextArea } from "@/components/ActionForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createCampaignAction, createTeamAction, importTeamsAction, updateClubAction } from "@/app/admin/actions";
import { brand } from "@/brand/brand.config";
import type { Club } from "@/lib/types";
import type { ActionState } from "@/components/ActionForm";

const defaults = {
  retailPriceKr: brand.defaults.retailPriceIncVatOre / 100,
  clubEarningKr: brand.defaults.clubEarningPerUnitOre / 100,
  vatRatePercent: brand.defaults.vatRateBp / 100,
};

export function ClubForms({ club }: { club: Club }) {
  const [tab, setTab] = useState<"club" | "team" | "campaign">("club");

  const updateWithId = async (_prev: ActionState, formData: FormData): Promise<ActionState> => updateClubAction(club.id, formData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Administrer"
          action={
            <div className="flex gap-1">
              {(
                [
                  ["club", "Klubb"],
                  ["team", "Lag"],
                  ["campaign", "Dugnad"],
                ] as const
              ).map(([key, label]) => (
                <Button key={key} size="sm" variant={tab === key ? "primary" : "secondary"} onClick={() => setTab(key)}>
                  {label}
                </Button>
              ))}
            </div>
          }
        />

        {tab === "club" ? (
          <ActionForm action={updateWithId} submitLabel="Lagre klubb" successMessage="Klubben er oppdatert." className="px-5 py-5">
            <div className="space-y-4">
              <Field label="Navn" name="name" defaultValue={club.name} required />
              <Field label="Organisasjonsnummer" name="organisationNumber" defaultValue={club.organisation_number} />
              <Field label="Kontaktperson" name="contactName" defaultValue={club.contact_name} />
              <Field label="Kontakt e-post" name="contactEmail" type="email" defaultValue={club.contact_email} />
              <Field label="Kontakt telefon" name="contactPhone" defaultValue={club.contact_phone} />
              <Field label="Adresse" name="address" defaultValue={club.address} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postnr." name="postalCode" defaultValue={club.postal_code} />
                <Field label="Sted" name="city" defaultValue={club.city} />
              </div>
              <Checkbox label="Aktiv" name="active" defaultChecked={club.active} />
            </div>
          </ActionForm>
        ) : null}

        {tab === "team" ? (
          <div className="space-y-8 px-5 py-5">
            <ActionForm action={createTeamAction} submitLabel="Legg til lag" successMessage="Laget er opprettet.">
              <input type="hidden" name="clubId" value={club.id} />
              <div className="space-y-4">
                <Field label="Lagnavn" name="name" placeholder="G2013" required />
                <Field label="Sesong" name="season" placeholder="2026" />
              </div>
            </ActionForm>

            <div className="border-t border-navy-100 pt-6">
              <ActionForm
                action={importTeamsAction}
                submitLabel="Importer lag"
                successMessage={(data) => `Importerte ${(data as { created: number } | undefined)?.created ?? 0} lag.`}
              >
                <input type="hidden" name="clubId" value={club.id} />
                <TextArea
                  label="CSV — kolonner: navn, sesong"
                  name="csv"
                  rows={6}
                  placeholder={"navn;sesong\nG2013;2026\nJ2014;2026"}
                />
              </ActionForm>
            </div>
          </div>
        ) : null}

        {tab === "campaign" ? (
          <ActionForm action={createCampaignAction} submitLabel="Opprett dugnad" successMessage="Dugnaden er opprettet." className="px-5 py-5">
            <input type="hidden" name="clubId" value={club.id} />
            <div className="space-y-4">
              <Field label="Navn" name="name" placeholder="Høstdugnad 2026" required />
              <Field label="Beskrivelse" name="description" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" name="startDate" type="date" />
                <Field label="Slutt" name="endDate" type="date" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Pris (kr)" name="retailPriceKr" type="number" step="0.01" defaultValue={defaults.retailPriceKr} />
                <Field label="Til klubb (kr)" name="clubEarningKr" type="number" step="0.01" defaultValue={defaults.clubEarningKr} />
                <Field label="Mva (%)" name="vatRatePercent" type="number" step="0.1" defaultValue={defaults.vatRatePercent} />
              </div>
              <Field label="Salgsmål (antall)" name="salesTargetQuantity" type="number" defaultValue={0} />
              <Field label="Hentested" name="pickupLocation" placeholder="Klubbhuset, Søgne" />
              <Field label="Hentedato" name="pickupDate" type="date" />
              <Select
                label="Toppliste"
                name="leaderboardEnabled"
                options={[
                  { value: "on", label: "På" },
                  { value: "", label: "Av" },
                ]}
                defaultValue="on"
              />
            </div>
          </ActionForm>
        ) : null}
      </Card>
    </div>
  );
}
