"use client";

import { ActionForm, Field } from "@/components/ActionForm";
import { createClubAction } from "../actions";

export function CreateClubForm() {
  return (
    <ActionForm action={createClubAction} submitLabel="Opprett klubb" successMessage="Klubben er opprettet." className="px-5 py-5">
      <div className="space-y-4">
        <Field label="Navn" name="name" required placeholder="Søgne FK" />
        <Field label="Organisasjonsnummer" name="organisationNumber" placeholder="912 345 678" />
        <Field label="Kontaktperson" name="contactName" />
        <Field label="Kontakt e-post" name="contactEmail" type="email" />
        <Field label="Kontakt telefon" name="contactPhone" />
        <Field label="Adresse" name="address" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Postnr." name="postalCode" />
          <Field label="Sted" name="city" />
        </div>
      </div>
    </ActionForm>
  );
}
