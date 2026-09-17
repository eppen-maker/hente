# Hente Invest — Investment Intelligence

Internt system for investeringsselskapet: registrere og analysere selskaper, strukturere regnskapstall,
fordele investeringer mellom investorer, og kjøre scenarioanalyse på enkeltcase og hele porteføljen.

Ikke en CRM. Alle tall er klassifisert, og systemet gjetter aldri.

## Kjør lokalt

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
npm run reset      # nullstill til demo-data
```

Demodata seedes automatisk til `data/store.json` første gang appen leses (8 selskaper, 5 investorer,
5 investeringer, 5 års regnskap per selskap). Filen er gitignorert.

## Datakvalitet — fire klasser

Hvert tall i systemet tilhører nøyaktig én klasse, og de blandes aldri i UI:

| Klasse | Eksempel | Hvor det kommer fra |
|---|---|---|
| `RAW` | Revenue 2025 = NOK 61 200 000 | Rapporterte regnskap, børsdata. Lagres med kilde, periode og sist oppdatert |
| `CALCULATED` | Revenue CAGR = 26 % | Deterministisk utledet av raw data |
| `ASSUMPTION` | Vekst til 2030 = 22 % p.a. | Våre egne inputs (vekst, margin, exit-multippel, utvanning) |
| `INTERPRETATION` | «Growth appears to be accelerating» | Lesning av raw + calculated, alltid merket |

Manglende data vises som `DATA UNAVAILABLE` og listes under *Missing information*. Scenarioverdier
presenteres aldri som faktisk verdi — current value og scenario value er alltid visuelt adskilt.

## Struktur

```
app/
  page.tsx                  Dashboard (KPI-er, verdi over tid, allokering, største posisjoner)
  companies/                Liste med søk, filtre og sortering + registrering
  companies/[id]/           Overview · Financial history · Analysis · Thesis · Valuation ·
                            Scenarios · Cap table · Timeline · Documents · Memos
  investors/                Investorer + personlig porteføljedashboard
  allocate/                 Fordel en investering mellom investorene (struktur A eller B)
  sizing/                   «Hvor mye bør vi investere?» — sensitivitet på investeringsstørrelse
  scenario-lab/             Hele porteføljen samtidig, totalt og per investor
  capital/                  Capital deployment og konsentrasjon
  updates/                  Registrerte hendelser og varselregler
  memos/ data/              Memo-snapshots og datakilder/datakvalitet
  api/                      Muterende endepunkter (companies, investors, investments, lab, memos, documents)
lib/
  types.ts        Domenemodell
  db.ts           Persistens (JSON document store — byttes til Postgres/Supabase uten å røre UI)
  seed.ts         Demodata
  finance.ts      CAGR, marginer, multipler, scenarioprojeksjon, MOIC, IRR
  portfolio.ts    Posisjoner, porteføljeaggregater, investorattribusjon, allokering
  analysis.ts     Analysemotor (fakta vs tolkning), thesis-strukturering, snapshot-sammenligning
  memo.ts         Investment memo-generator
  datasources.ts  Data abstraction layer for Brønnøysund, Proff, markedsdata
```

## Eierstruktur

To strukturer støttes, og de blandes aldri i beregningen:

* **Struktur A (DIRECT)** — personene eier aksjene direkte. Investors andel = hans beløp i den transaksjonen.
* **Struktur B (VEHICLE)** — personene eier Hente Invest AS, som eier aksjene. Verdien av selskapets
  posisjon beregnes først, deretter hver aksjonærs attributable value ut fra eierandel i Hente Invest AS.

Systemet støtter ulike eierandeler, ulike kapitalinnskudd, aksjonærlån, egenkapitalinnskudd og follow-ons.

## Scenariomodell

```
future revenue  = revenue(siste rapporterte år) × (1 + vekst)^år
future EBITDA   = future revenue × margin
company value   = future EBITDA × exit-multippel   (eller future revenue × multippel)
vår verdi       = company value × (eierandel × (1 − utvanning))
MOIC            = vår verdi / investert
IRR             = (vår verdi / investert)^(1/år) − 1
```

Downside / base / upside er sensitivitetsanalyser, ikke prognoser.

## Neste steg

Datakildene er stubbet bak `CompanyDataSource` i `lib/datasources.ts` (Brønnøysundregistrene, Proff,
markedsdata, rapport-parsing). Å koble på en kilde er å implementere det samme grensesnittet — ingen
side eller komponent må endres.

---

Repoet inneholder også et eldre, uavhengig verktøy: `icloud_mail_report.py` (reklamerapport for iCloud-mail).
Dokumentasjonen for det ligger i [`docs/icloud-mail-report.md`](docs/icloud-mail-report.md).
