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

### Ny mal vedtatt

`Timeliste_Espen.xlsx` (Drive-ID `1jl7mVeZEEbiWXbrHFg2hFfsgHeQNlKPm`) ga
grunnoppsettet: pausekolonne, 7,5 t normaltid, hele året 01.09.26–01.09.27.

**Men timetallet skal ikke vises.** Det eneste som er interessant er hvor
mange plusstimer eller minustimer den ansatte ligger på, hvorfor, og når
det tenkes jobbet inn igjen. Kolonnen som før viste «Arbeidstimer» viser nå
**avviket** direkte, og «Sum timer» / «Grunnlag» er fjernet.

Kolonner i timelisten:

| | | |
|---|---|---|
| A | Dato | formel |
| B | Ukedag | formel |
| C | Start | fylles ut |
| D | Slutt | fylles ut |
| E | Pause (min) | fylles ut |
| F | **Avvik (+/-)** | formel, tom når dagen går opp |
| G | **Begrunnelse** | fylles ut |
| H | **Når jobbes det inn?** | fylles ut |

Nøkkeltall i rad 3: `Timer +/- totalt` og `Denne måneden`. Ikke noe annet.

Dashbordet har fire kolonner: Navn, Timer +/-, Begrunnelse, Når jobbes det
inn. Avviket regnes ut i timelisten, så dashbordet trenger ikke lenger å
kjenne normaltiden — `Normal arbeidsdag`-cellen er borte.

Avviksformelen er verifisert: 07:00–15:00 med 30 min pause gir 0,
07:00–17:00 gir +2,00 (stemmer med skjermbildet fra det gamle arket),
07:00–12:00 gir −3,00, nattevakt 22:00–06:00 gir 0, og «7-15» uten
minutter gir +0,50. Et helt standardår summerer til nøyaktig 0 over 262
hverdager.

**Peter fører ikke timer.** `TIMELISTE Peter` er kastet. Han står kun som
redaktør på de 12 andres lister, dashbordet og godkjenningsarket.

### Dashbordet viste 0 for alle (16.09)

Espen førte overtid i sin timeliste, men dashbordet rørte seg ikke.
Undersøkt:

- `TIMELISTE Espen` endret 16.09 06:50, viser +2. Riktig.
- Godkjenningsarket henter «TIMELISTE» fra alle 13 kildene, så
  IMPORTRANGE-tilgangen **er** godkjent. Det var ikke der feilen lå.
- Dashbordet viste 0 på hver eneste rad, også Espens.

Drive-koblingen leser verdier, ikke formler, så hvilken fil-ID hver rad
faktisk peker på er ikke mulig å se herfra. Mest sannsynlig peker de på de
gamle 11.09-filene, som aldri er endret og derfor står på 0.

`byggDashbord()` løser det uansett årsak, siden den skriver alle formlene
på nytt mot ID-ene i `ARK`.

Lærdommen er lagt inn i koden: `avvikFormel()` faller tilbake til **blank**,
ikke 0, hvis koblingen ryker. En 0 leses som «ingen avvik» og skjuler at noe
er galt — akkurat denne fellen.

### Nettingregelen

Timer +/- nettes av seg selv: −2 mandag, −1 tirsdag og +3 torsdag gir 0.
Spørsmålet er hva som skal stå igjen av *begrunnelser*.

Regelen er: **alt fram til forrige gang saldoen sto i null er gjort opp.**
Bare grunnene etter siste nullpunkt er relevante.

| Sekvens | Total | Dashbordet viser |
|---|---|---|
| −2 hest, +2 tok igjen, −3 syk | −3,00 | bare «syk −3,00» |
| −4 syk, +2 jobbet inn | −2,00 | begge — ingenting er gjort opp |
| −2 hest, −2 hest, +4 ferdig, −2, +2 | 0,00 | ingenting |
| alt standard | 0,00 | ingenting |

Saldoen regnes i den ansattes **eget ark**, ikke i dashbordet. Kolonne I
holder løpende saldo (lineært, én formel per rad), `J1` finner siste rad
der den sto i null, og `J2`/`J3` plukker ut tekstene etter det punktet.
Dashbordet henter bare de to ferdige cellene.

Grunnen til at det ikke gjøres i dashbordet: en kumulativ sum over
IMPORTRANGE blir kvadratisk — 366 rader i kvadrat, ganger 12 ansatte.
Her er den lineær.

Kolonne I og J er skjult. Den synlige delen er fortsatt A–H.

### Dashbordet bygges nå som .xlsx

Google konverterer .xlsx til Sheets **med** formatering, og `IMPORTRANGE`,
`ARRAYFORMULA` og `SORT` overlever konverteringen. Det er verifisert. Den
gamle notisen om at xlsx-opplasting feiler gjelder ikke lenger.

Det gjør at dashbordet kan lages ferdig formatert uten Apps Script. To
forbehold:

- **Størrelse.** Base64-blokken må inn i verktøykallet for hånd, og over
  ~10 KB blir det upraktisk. Timelistemalen på 19 KB ble kopiert feil og ga
  «Invalid conversion requested» — det var en kopieringsfeil, ikke en
  grense i Drive. For de 12 timelistene er Apps Script riktig verktøy.
- **Nye fil-ID-er.** Et opplastet ark er en ny fil. Dashbordet tåler det
  fint (det er bare én), men timelistene gjør det ikke — da må dashbordets
  IMPORTRANGE-er skrives om.

Det aktive dashbordet er `1-9gTcRxaabLPqfCgKoai7id3onDr3yXCufy_rRG5k-M`.
Det peker på dagens oppsett i timelistene (`E7:E206`, normaltid 8), ikke på
det nye. Kjører du `byggOmAlle()`, blir kolonne E til Pause (min), og
dashbordet vil summere pauseminutter uten å gi feilmelding. Kjør derfor
`byggDashbord()` i samme slengen — eller bare `settOppAlt()`.

### Sortering og utseende

Dashbordet sorteres stigende på avvik, så de som skylder timer havner
øverst. Sorteringen må være levende siden verdiene kommer fra IMPORTRANGE
og endrer seg av seg selv. Derfor ligger formlene i et skjult hjelpeark
(`Data`), og dashbordet viser `=SORT(Data!A2:D13;2;USANN)` over det.
Sorterte man radene direkte, ville rekkefølgen fryse på verdiene slik de
var da scriptet kjørte.

Farger: vekselvis hvite og lyseblå rader i både timeliste og dashbord,
negative avvik i rødt og positive i grønt. I timelisten står avvikscellen
tom når dagen går opp, slik at bare avvikene fanger øyet.

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
