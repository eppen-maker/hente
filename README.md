# Reklamerapport for iCloud-mail

Finner ut hvem som sender deg mest reklame, og gir deg avmeldingslenkene
deres. Leser **kun meldingshoder** over IMAP - aldri innhold, aldri vedlegg -
og bruker `BODY.PEEK`, så ingenting blir markert som lest.

Bare Python-standardbiblioteket. Ingen `pip install`.

## Oppsett

**1. Lag et app-spesifikt passord.** Apple tillater ikke Apple ID-passordet
ditt over IMAP. Gå til [account.apple.com](https://account.apple.com) →
Sign-In and Security → App-Specific Passwords → lag ett, kall det f.eks.
`mail-agent`. Kontoen må ha tofaktor slått på.

**2. Legg passordet i Keychain** (ikke i et script, ikke i shell-historikken):

```sh
security add-generic-password -a "deg@me.com" -s "icloud-mail-agent" -w
```

Kommandoen spør etter passordet uten å vise det. Alternativt: sett
`ICLOUD_APP_PASSWORD` i miljøet.

**3. Kjør.**

```sh
python3 icloud_mail_report.py --user deg@me.com --days 90
```

## Bruk

```sh
# Hvem sender oftest, gruppert per selskap i stedet for per adresse
python3 icloud_mail_report.py --user deg@me.com --by domain

# Bare de virkelig aggressive: minst 10 mailer på 30 dager
python3 icloud_mail_report.py --user deg@me.com --days 30 --min-count 10

# Maskinlesbart, til videre behandling
python3 icloud_mail_report.py --user deg@me.com --format json > rapport.json

# Rapport du kan lime inn et sted
python3 icloud_mail_report.py --user deg@me.com --format markdown > rapport.md
```

Standard er å vise bare masseutsending. `--all` tar med vanlig e-post også.

## Hva som regnes som reklame

En avsender flagges når hodene bærer minst ett av disse:

| Signal | Hva det betyr |
| --- | --- |
| `List-Unsubscribe` | Avsender har lagt ved avmeldingslenke. Sterkeste signalet. |
| `List-Id` | Meldingen kom fra en mailingliste. |
| `Precedence: bulk/list/junk` | Avsender merker den selv som masseutsending. |
| `Auto-Submitted` | Maskingenerert. |
| Avsenderadresse | `no-reply@`, `nyhetsbrev@`, `kampanje@`, `tilbud@` osv. |

Rapporten viser hvilke signaler som traff, så du kan se hvorfor noe havnet på
lista.

## Å sette det opp som agent

Scriptet er selve verktøyet. «Agenten» er noe som kjører det for deg og
handler på resultatet. Tre nivåer, i økende rekkefølge:

**Manuelt.** Kjør kommandoen når du orker å rydde. Klikk deg gjennom
avmeldingslenkene. Holder for de fleste.

**Claude Code lokalt.** Installer Claude Code på maskinen din, `cd` inn i
denne mappa, og be den kjøre rapporten og foreslå hva du bør melde deg av.
Poenget med å kjøre det *lokalt* er at passordet aldri forlater maskinen din -
det ligger i Keychain, scriptet henter det ved kjøring, og verktøyet kan bare
lese hoder. En agent i skyen ville trengt at du ga fra deg passordet.

**På timeplan.** En `launchd`-jobb som kjører rapporten ukentlig og skriver
til fil:

```sh
python3 icloud_mail_report.py --user deg@me.com --days 7 \
  --format markdown > ~/Documents/reklame-uke.md
```

## Sikkerhet

- Passordet leses fra Keychain eller miljøvariabel ved kjøring, og skrives
  aldri til disk.
- Bruk app-spesifikt passord, aldri Apple ID-passordet. Du kan trekke det
  tilbake fra account.apple.com uten å berøre kontoen ellers.
- Tilkoblingen er read-only (`SELECT ... readonly=True`). Scriptet kan ikke
  slette, flytte eller sende noe.
- Kun hodefeltene i `WANTED_HEADERS` hentes ned. Meldingsteksten din blir
  aldri lest.

## Feilsøking

**«Innlogging avvist»** - du bruker sannsynligvis Apple ID-passordet. Lag et
app-spesifikt et. Har du en gammel `@me.com`-konto, prøv brukernavnet uten
domenet: `--user deg` i stedet for `--user deg@me.com`.

**«Fant ikke passord i Keychain»** - kjør `security add-generic-password`
-kommandoen over, med nøyaktig samme adresse som du sender til `--user`.

**Tomt resultat** - prøv `--min-count 1 --all` for å se om det i det hele tatt
kommer meldinger ned, og `--days 365` for et større vindu.

## Tester

```sh
python3 -m unittest test_icloud_mail_report -v
```

24 tester, alle mot syntetiske hoder. Ingen nettverk, ingen konto nødvendig.
