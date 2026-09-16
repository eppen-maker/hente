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

Verifisert mot Disk:

- Alle 13 timelistene og dashbordet finnes og eies av espensensen@gmail.com.
- Ingen av filene er delt med noen ennå — kun eier står i tilgangslisten.
- B2 (Navn) er fortsatt tom i alle 13. Formateringen er altså ikke kjørt.
- Formlene virker: Malin viser Sum timer 1152 og Timer +/- 0, altså
  144 arbeidsdager × 8. Datoene går 01.09.2026–19.03.2027, nøyaktig 200 rader.
- Under rad 206 ligger 5 rader med `07.00`/`15.00` uten dato — rester fra
  CSV-importen. De er utenfor `E7:E206` og påvirker ikke summen, men de ser
  ut som dager man skal fylle ut.
- Mappen har 35 filer: 15 aktive, 20 utdaterte.

### Rettelser i `formater_timelister.gs`

Scriptet slik det lå ville feilet. To reelle feil, begge rettet:

1. `SpreadsheetApp.getUi()` på siste linje i `formaterAlle` kaster i et
   frittstående prosjekt — den finnes bare i ark-bundne script. Formateringen
   hadde gått gjennom, men kjøringen endt i rød feilmelding. Erstattet med
   `varsle()` som logger alltid og prøver UI i en try/catch.
2. Den betingede formateringen brukte `;` som argumentskille og
   tekstsammenlikning mot «lørdag»/«søndag». Formler som sendes inn via
   Apps Script må bruke komma uansett norsk lokalitet. Erstattet med
   `=AND($A7<>"",WEEKDAY($A7,2)>5)`, som slipper unna både skilletegnet og
   spesialtegnene.

I tillegg lagt til:

- Rydder restradene under rad 206.
- Setter Start/Slutt til tekstformat (`@`), slik at Sheets ikke gjør dem om
  til tidsverdier og bryter REGEXEXTRACT-parsingen.
- `beskyttFormler()` legger advarsel (ikke lås) på Dato, Ukedag, Timer og
  nøkkeltallsraden, så en ansatt ikke sletter en ARRAYFORMULA ved uhell.
- `overforEierskap()` for siste steg. Drive-koblingen kan bare sette
  writer/commenter/reader, ikke owner — eierskifte må gå via Apps Script.

## Hva som gjenstår

1. **Formatering.** Kjør `formaterAlle` i script.google.com. Ikke kjørt ennå.
2. **Deling.** Mangler e-postadressene til de 13. Hver timeliste deles med
   den ansatte + Peter som redaktør, dashbordet kun med Peter og Espen.
   Ingen «alle med lenken».
3. **Opprydding.** 20 utdaterte filer skal i papirkurven — se listen under.
4. **Eierskap.** Helt til slutt: `overforEierskap()` med Peters e-post.

### De 20 utdaterte filene

`Timeliste MAL`, `Timeliste MAL v3`, `Timeliste MAL v5`, `Timeliste MAL v6`,
`TEST tid`, `TEST tid 2`, `Dashbord Peter` (den gamle, fra 11.09), og de 13
gamle `Timeliste <navn>`-filene med pausekolonne.

Aldri de 15 aktive: `TIMELISTE <navn>` (13 stk), `DASHBORD Peter`,
`1 GODKJENN TILGANG FORST`.

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
