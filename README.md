# SØR° — dugnadsplattform

Norsk dugnadsplattform for SØR°. Organisasjoner (idrettslag, korps, foreninger)
kjøper premium hverdagsprodukter til fast innkjøpspris og selger dem videre til
veiledende utsalgspris. Differansen beholder de selv.

Plattformen dekker den offentlige nettsiden, fortjenestekalkulatoren,
partnerlenker per organisasjon og en fullt fungerende bestillingsflyt. CRM og
betaling er bevisst ikke bygget ennå, men datamodellen og databaseskjemaet er
lagt opp for begge deler.

**Alt kjører lokalt uten database.** Er ikke Supabase satt opp, leser appen
demodata fra `src/lib/data/demo/` og skriver bestillinger til `.data/`. Samme
kode, samme tall — bytt inn miljøvariablene når databasen skal på.

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

## Bestillingsflyt

- `/dugnad/[slug]` — partnerlenke per organisasjon, med avtalt pris og
  kalkulator (`/dugnad/sogne-fk`, `/dugnad/sogne-handball`, `/dugnad/randesund-fk`)
- `/dugnad/[slug]/bestill` — bestilling på den dugnadens pris
- `/bestill` — bestilling uten dugnadslenke, på standardpris
- `/dugnad` — oversikt over åpne dugnader (ikke lenket fra menyen)

Fire steg: Dugnad → Mål → Antall → Oppsummering. Målet kan settes som produkter
per deltaker, ønsket fortjeneste eller totalantall. Fortjenesten står i en
sticky panel på desktop og en kompakt linje på mobil.

Bestillinger får et lesbart ordrenummer, `SOR-2026-0001`, som teller opp per år.
I databasen lages det av `next_order_number()`, som er kollisjonsfri; lokalt av
en tilsvarende teller i `.data/order-counters.json`.

### Ingen priser fra klienten

`/api/orders` tar imot antall, deltakere og kontaktinfo — aldri beløp. Zod
fjerner ukjente felter, kampanjen og produktet lastes på nytt fra databasen, og
`calculateOrder()` regner ut alt på nytt før noe lagres. Kvitteringen viser
serverens egne tall, så den kan ikke vise noe annet enn det som ble lagret.

## Priser er konfigurerbare, ikke hardkodet

Alle beløp kommer fra én kilde: `src/lib/config/pricing.ts`.

```ts
consumerPrice:     200   // det kunden betaler
organizationPrice: 120   // klubbens innkjøpspris inkl. mva.
// margin utledes: 200 − 120 = 80 kr per produkt
```

Ingen komponent regner ut en margin selv. Alt går gjennom `resolvePricing()` og
`resolveProductPricing()`, som slår opp i denne rekkefølgen:

1. konfigurert volumtrinn (`volume_pricing`)
2. dugnadens avtalte pris (`campaign_pricing`)
3. produktets standardpris (`products.default_partner_price`)

Et volumtrinn kan bare senke den avtalte prisen, aldri heve den. Ingen trinn er
seedet, så kundene ser ingen oppfunnet rabatt.

Prisene lagres inkl. mva. (`PRICES_INCLUDE_VAT`). Netto og mva. utledes fra
bruttobeløpet med `splitVat()` når en ordre skrives.

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
  components/order/    Bestillingsflyt: steg, sticky oppsummering, kvittering
  lib/
    calc/              Fortjenesteberegning og ordreøkonomi
    config/            Priser, kalkulatorstandarder, navigasjon
    data/demo/         Demodata som speiler SQL-seeden
    repositories/      Datatilgang: dugnader, katalog, ordrer, forespørsler
    supabase/          Klienter for nettleser og server
    validation/        Validering av innsendte skjemaer
  types/               Organization, Product, FundraisingCampaign, Pricing, Order
supabase/migrations/   SQL-skjema som speiler typene
tests/                 Enhetstester (node:test)
```

## Supabase

Supabase er valgfritt. Uten miljøvariabler kjører alt lokalt: dugnader og
produkter fra `src/lib/data/demo/`, bestillinger og forespørsler til `.data/`.

Migrasjonene kjøres i rekkefølge:

| Fil | Innhold |
| --- | --- |
| `0001_init.sql` | Skjema: `organizations`, `products`, `campaigns`, `campaign_pricing`, `volume_pricing`, `orders`, `order_items`, `campaign_leads`, ordrenummer-funksjonen |
| `0002_rls.sql` | Row level security og kolonnerettigheter for anonyme brukere |
| `0003_seed_demo.sql` | Demodata: SØR° Refill og de tre dugnadene |

Kjør dem i Supabase SQL Editor, eller med `supabase db push` hvis CLI-en er satt
opp. Sett deretter variablene i `.env.example`.

### Rettigheter

Anonyme brukere kan lese aktive produkter, åpne dugnader og den avtalte prisen
for den dugnaden — og sende inn en bestilling. De kan ikke liste ut bestillinger,
lese kontaktinfo eller adresser på organisasjoner, eller røre `order_counters`.
Ordreskriving fra appen går gjennom serveren med service role-nøkkelen, som
aldri sendes til nettleseren.

## Design

Skandinavisk, redaksjonelt uttrykk: varm off-white bakgrunn, kullsvart typografi,
sand- og steinflater, store display-tall i serif og svært dempede animasjoner.
Alle designtokens ligger i `src/app/globals.css` (Tailwind v4 `@theme`).
Produktbildene er plassholdere (`ProductVisual`) fram til ekte produktfoto
foreligger — layouten trenger ingen endring når bildene kommer.

## Annet i dette repoet

- [`README-icloud-mail.md`](./README-icloud-mail.md) — reklamerapport for
  iCloud-mail (`icloud_mail_report.py`), et frittstående Python-verktøy.
