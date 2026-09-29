# Oppdrag: timeregistrering for 13 ansatte i Google Sheets

Du overtar et prosjekt som allerede er halvveis. Les hele denne filen før du gjør noe.

## Hva som finnes i dag

Alt ligger i Google Disk-mappen «Timelister»:
https://drive.google.com/drive/folders/1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw

**13 personlige timelister** (Google Regneark), én per ansatt:

| Navn | Fil-ID |
|---|---|
| Malin | 1jkjB0hMdyQ7SroUQsFMqhS6ZMC8wcXaVjc8Ckm4tNrU |
| Even | 131S_Q0_ZqntMbSTcpQzORYpiNZtfd6rmJkgfrd1FVGc |
| Sverre | 1gYgleo4KwhSLzgv8GXIqKLgY7lA6Ys2My1lvtEzyVo0 |
| Elias | 1EH_RbKtJ1_mmHmQ-YhLD9r9JG55dHvy2OYCpgNoN0_k |
| Liliane | 1q-_RYTX9O9njdbGwZxYV8EO6VjMAaT_LDOHZ9hRCqKY |
| Marlene | 1crQwlbGfrI5NIrGWi-FNdVZonJboYxgKeYIecaQNh7I |
| Kristine | 1WWMSQMpNx13qlVx1hCtgGOoxkj2nNO1nE6tOFjwlOLw |
| Paul | 1XCHaIcpFKjZql6M65IJXbNlBGrSxgC_6-mmnBIkOtlo |
| Glenn | 1gIMD6qubvqCcopfXfNEPbdC9EcZK1U-YhL4GUe1qEW4 |
| Espen | 1-A6XMtVjLuCXIav6WbjJddUdWiik9qrYCYdSgGgC_Tw |
| Peter | 1jraQI5P0cyP2b3hNsjAUYh0QBmSvfLMS5foQsZ4RN6I |
| Ailin | 1u5OKwN_twDrpGUX1h3DUZ-2NdXu3EsuS3gUTXa0Cnrk |
| David | 1yvDKPJlKOOsZRhM46C5LP4P2rdbbCJ05UnknzYRKS3w |

**Dashbord (for Peter og Espen, som er lederne):**
1L9J9rZ0DEOa_-H5AvolSrK92xVu1sBEGxVmt53Tan8U

**Godkjenningsark** (tvinger fram «Tillat tilgang» for IMPORTRANGE):
1LFJyyoNzbf5O3VOAxJFOs0vVNRHrtPhbeHsXXNRAepg

## Slik er timelistene bygget

| Celle | Innhold |
|---|---|
| B2 | Navn |
| D2 | Startdato (01.09.2026) |
| F2 | Normaltid pr. dag = 8 |
| B3 | `=ROUND(SUM(E7:E206);2)` sum timer |
| D3 | `=ROUND(SUM(E7:E206)-COUNT(E7:E206)*$F$2;2)` timer +/- |
| Rad 6 | Overskrifter: Dato, Ukedag, Start, Slutt, Timer, Kommentar / begrunnelse |
| A7 | ARRAYFORMULA som fyller 200 datoer nedover fra D2 |
| B7 | ARRAYFORMULA med norsk ukedag via CHOOSE(WEEKDAY(...;2);...) |
| C, D | Start og Slutt. 07.00-15.00 ferdig utfylt paa hverdager, tomt i helger |
| E7 | ARRAYFORMULA som regner timer (se under) |
| F | Kommentar / begrunnelse, fylles av den ansatte |

### Timer-formelen — ikke rør denne uten å forstå hvorfor

Klokkeslettene ligger som **tekst**, ikke som ekte tidsverdier. Enkel subtraksjon
gir #VALUE!. Formelen parser derfor timer og minutter med REGEXEXTRACT, og tåler
`07.00`, `07:00` og `7`. MOD(...;24) håndterer nattevakt over midnatt.

```
=ARRAYFORMULA(IF((C7:C206="")+(D7:D206="")>0;"";
 ROUND(MOD(
  (IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(D7:D206);"(\d{1,2})"));0)
   +IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(D7:D206);"\d{1,2}[.:](\d{2})"));0)/60)
 -(IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(C7:C206);"(\d{1,2})"));0)
   +IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(C7:C206);"\d{1,2}[.:](\d{2})"));0)/60)
 ;24);2)))
```

Testet og verifisert: 07.00-15.00 = 8, 07:00-13:30 = 6,5, 7-15 = 8, 22.00-06.00 = 8.

## Dashbordet

Én rad per ansatt med tre kolonner: Navn, Timer +/-, Begrunnelse. B2 = normal
arbeidsdag (8). Hver rad henter med IMPORTRANGE mot personens fil-ID:

- **Timer +/-**: `SUM(E7:E206) - COUNT(E7:E206) * $B$2`
- **Begrunnelse**: TEXTJOIN over alle dager der kolonne F ikke er tom, formatert
  som `dd.mm ±Xt <begrunnelse>`

Merk: IFERROR rundt IMPORTRANGE skjuler #REF!, og da forsvinner også Googles
«Tillat tilgang»-knapp. Derfor finnes godkjenningsarket med bare `IMPORTRANGE(id;"A1")`
per rad. Beholder du det mønsteret, unngår du en felle jeg gikk i.

## Status 16.09.2026

### Oppsettet i timelista

| | | |
|---|---|---|
| A | Dato | formel |
| B | Ukedag | formel |
| C | Start | fylles ut |
| D | Slutt | fylles ut |
| E | Kommentar / begrunnelse | fylles ut |
| F | Når jobbes det inn? | fylles ut |
| G–I | avvik, løpende saldo, regneplass | **skjult** |

**Timetallet vises ikke.** Det eneste som er interessant er hvor mange
plusstimer eller minustimer man ligger på — det står i `B3`, grønt i pluss
og rødt i minus. Avviket per dag regnes skjult i G.

**Tom rad = vanlig dag.** Ingenting er forhåndsutfylt. Er raden tom på en
hverdag, gir den 0 i avvik. Man fyller bare ut Start og Slutt de dagene man
avviker. Helg teller ikke.

Normaltid 8 t, ingen pausekolonne, hele året 01.09.2026–01.09.2027.
Normaltiden står i `F2` og slår gjennom overalt.

Klokkeslettene er ekte tidsverdier, ikke tekst, så `MOD(D−C;1)*24` holder —
den håndterer også nattevakt over midnatt. Den gamle
REGEXEXTRACT-parsingen er dermed unødvendig.

Verifisert: tom rad 0, 07:00–15:00 gir 0, 07:00–13:00 gir −2,00,
07:00–19:00 gir +4,00, nattevakt 22:00–06:00 gir 0, helg blank.

**Peter fører ikke timer.** Han står kun som redaktør.

### Hvorfor dette ikke kunne leveres som .xlsx

Dashbordet ble laget som .xlsx og konvertert av Google — det virker. Men
timelistemalen lot seg ikke overføre. Base64-blokken må limes inn i
verktøykallet for hånd, og fire forsøk på 8,5–23 KB ble korrupte
underveis. Feilmeldingene («Invalid conversion requested», «not a valid
base64 string») kom av kopieringsfeil, ikke av noen grense i Drive.

Dashbordet på ~9 KB gikk gjennom to ganger, men det er flaks på den
størrelsen, ikke en metode å stole på. **Timelistene må bygges med Apps
Script.**

### Verifisert mot Disk

- 12 aktive timelister + dashbord + godkjenningsark, eid av
  espensensen@gmail.com. Ingen av dem er delt med noen ennå.
- 20 utdaterte filer er kastet (MAL-er, TEST-filer, gammelt dashbord, og de
  13 gamle `Timeliste <navn>`-filene).
- Drive-koblingens `update_file` kan bare endre tittel og mappe, ikke
  celleinnhold. All skriving til arkene må derfor gå via Apps Script.

### Rettelser i `formater_timelister.gs`

To reelle feil i den opprinnelige filen, begge rettet:

1. `formaterAlle` avsluttet med `SpreadsheetApp.getUi().alert(...)`. `getUi()`
   finnes bare i ark-bundne script — i et frittstående prosjekt, som er akkurat
   det bruksanvisningen ber om, kaster den. Formateringen hadde gått gjennom,
   men kjøringen endt i rød feilmelding. Erstattet med `varsle()`.
2. Helgeformateringen brukte `;` som argumentskille og tekstsammenlikning mot
   «lørdag»/«søndag». Formler som sendes inn via Apps Script må bruke komma
   uansett norsk lokalitet. Erstattet med
   `=AND($A7<>"",WEEKDAY($A7,2)>5)`.

### Scriptet bygger nå hele oppsettet

`settOppAlt()` kjører i rekkefølge:

1. `byggOmAlle()` — skriver om de 12 arkene **på plass**. Fil-ID-ene er
   uendret, så IMPORTRANGE-ene i dashbordet peker fortsatt riktig. Dette er
   grunnen til at arkene bygges om framfor å opprettes på nytt.
2. `byggDashbord()` — 12 rader med Navn, Timer +/-, Begrunnelse og
   Når jobbes det inn. Henter `F7:F372` (avvik), `G7:G372` og `H7:H372`.
3. `byggGodkjenn()` — naken `IMPORTRANGE(id;"Timeliste!A1")` per ansatt,
   uten IFERROR, slik at «Tillat tilgang»-knappen faktisk dukker opp.
4. `delAlle()` — hopper over seg selv hvis EPOST-tabellen ikke er utfylt.

`overforEierskap()` er bevisst ikke med i `settOppAlt()`, siden eierskifte
ikke kan angres. Drive-API-et kan bare sette writer/commenter/reader, så det
steget må uansett gå via Apps Script.

**`byggOmAlle()` tømmer arkene før den bygger dem opp igjen.** Den må ikke
kjøres etter at de ansatte har begynt å føre timer. Formatering og deling kan
kjøres fritt.

## Hva som gjenstår

1. **Kjør `settOppAlt()`** i script.google.com.
2. **E-postadressene.** 12 ansatte + Peter. Uten dem hopper `delAlle()` over
   seg selv og sier fra hvem som mangler.
3. **Peter må åpne godkjenningsarket** og trykke «Tillat tilgang» på hver rad,
   ellers står dashbordet tomt.
4. **Eierskap.** `overforEierskap()` helt til slutt.

## Viktige begrensninger å kjenne til

- **Drive-koblingen kan ikke redigere celler eller formatering.** Bare opprette,
  kopiere, dele, lese og slette. All redigering av eksisterende ark må gå via
  Apps Script.
- **Opplasting av .xlsx til Disk feiler** med «Invalid conversion requested».
  Tekst/CSV fungerer. Derfor er arkene bygget fra CSV.
- **Excel-konvertering ødelegger klokkeslett** — de blir til tekst som
  «kl. 15.00.00». Det er hele grunnen til at Timer-formelen ser ut som den gjør.
- **Norsk lokalitet**: formler bruker semikolon som argumentskille, og klokkeslett
  skrives med punktum (07.00).

## Brukerens preferanser

Direkte og konkret. Vil ha ting gjort, ikke forklart. Har brukt mye tid på dette
allerede og er lei av runder fram og tilbake — test derfor selv der du kan,
og spør bare når du faktisk står fast. Gjør det du kan gjøre uten å spørre.
