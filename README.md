# SØR° — dugnadsplattform

Norsk dugnadsplattform for SØR°. Organisasjoner (idrettslag, korps, foreninger)
kjøper premium hverdagsprodukter til fast innkjøpspris og selger dem videre til
veiledende utsalgspris. Differansen beholder de selv.

Denne fasen dekker den offentlige nettsiden og fortjenestekalkulatoren. CRM og
betaling er bevisst ikke bygget ennå, men datamodellen og databaseskjemaet er
lagt opp for det.

## Kom i gang

```sh
npm install
npm run dev        # http://localhost:3000
```

| Kommando | Gjør |
| --- | --- |
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg |
| `npm start` | Kjører produksjonsbygget |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config fra Next 16) |
| `npm test` | Enhetstester for pris- og fortjenesteberegning (ingen ekstra avhengigheter) |

## Priser er konfigurerbare, ikke hardkodet

Alle beløp kommer fra én kilde: `src/lib/config/pricing.ts`.

```ts
consumerPrice:     200   // det kunden betaler
organizationPrice: 120   // klubbens innkjøpspris inkl. mva.
// margin utledes: 200 − 120 = 80 kr per produkt
```

Ingen komponent regner ut en margin selv. Alt går gjennom `resolvePricing()`,
som tar imot `pricingId` (per produkt eller per organisasjon) og `quantity`
(volumtrinn). Prislisten `pricing-volume-2026` viser mekanikken med
volumrabatter; standardavtalen er flat, slik at eksempeltallene stemmer.

## Beregning

`src/lib/calc/fundraising.ts` inneholder all matematikk:

- `calculateProfit()` — produkter × margin
- `calculateRequiredProducts()` — ønsket fortjeneste ÷ margin, rundet opp
- `calculateProductsPerParticipant()` — produkter ÷ deltakere, rundet opp
- `projectFromProductsPerParticipant()` — modus A
- `projectFromProfitGoal()` — modus B, lander alltid på eller over målet
- `projectFromTotalProducts()` — hurtigvolum-kortene

Referanseeksemplene er dekket av tester: 600 deltakere × 10 produkter gir
480 000 kr, og et mål på 500 000 kr gir 11 produkter per deltaker, 6 600
produkter og 528 000 kr.

## Tallformat

`src/lib/format.ts` formaterer manuelt (ikke `Intl`), slik at server og
nettleser gir nøyaktig samme streng og hydreringen ikke bryter. Tusenskille og
mellomrom foran «kr» er hardt mellomrom: `6 000`, `480 000 kr`, `1,2 mill. kr`.

## Struktur

```
src/
  app/                 App Router-sider (norske ruter) + /api/leads
  components/
    brand/             Logo og produktplassholdere
    calculator/        Kalkulator: tilstand, resultatpanel, volumkort
    charts/            Recharts-visning av fortjeneste per volum
    forms/             Dugnadsforespørsel, kontakt, innlogging
    layout/            Header og footer
    marketing/         Seksjoner på de offentlige sidene
    ui/                Gjenbrukbare primitiver (Button, Card, Field, …)
  lib/
    calc/              Fortjenesteberegning
    config/            Priser, kalkulatorstandarder, navigasjon
    data/              Seedet demodata (produkter, organisasjoner)
    repositories/      Lagring av forespørsler
    supabase/          Klienter for nettleser og server
    validation/        Validering av innsendte skjemaer
  types/               Organization, Product, FundraisingCampaign, Pricing, Order
supabase/migrations/   SQL-skjema som speiler typene
tests/                 Enhetstester (node:test)
```

## Supabase

Supabase er valgfritt i denne fasen. Uten miljøvariabler fungerer nettsiden som
normalt, og forespørsler fra «Start en dugnad» skrives til `.data/leads.json`.
Med variabler satt (`.env.example`) skrives de til tabellen `campaign_leads`.

Skjemaet ligger i `supabase/migrations/0001_init.sql` og dekker `pricing`,
`pricing_tiers`, `products`, `product_variants`, `organizations`, `campaigns`,
`orders`, `order_lines` og `campaign_leads`.

## Design

Skandinavisk, redaksjonelt uttrykk: varm off-white bakgrunn, kullsvart typografi,
sand- og steinflater, store display-tall i serif og svært dempede animasjoner.
Alle designtokens ligger i `src/app/globals.css` (Tailwind v4 `@theme`).
Produktbildene er plassholdere (`ProductVisual`) fram til ekte produktfoto
foreligger — layouten trenger ingen endring når bildene kommer.

## Annet i dette repoet

- [`README-icloud-mail.md`](./README-icloud-mail.md) — reklamerapport for
  iCloud-mail (`icloud_mail_report.py`), et frittstående Python-verktøy.
