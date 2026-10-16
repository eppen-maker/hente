# tradeleif – AI-fond (papirhandel)

Claude Code hjelper deg utvikle programmet. Selve boten er et Python-program som
sender data til Anthropic API og eventuelt sender simulerte ordre til Alpaca.
Claude Code trenger ikke stå åpent. API-bruk faktureres separat fra abonnementet.

## Oppsett

Python 3.11 eller nyere, internett, en Alpaca paper-konto og Anthropic API-nøkkel.
Ingen Python-pakker må installeres. Bruk en separat paper-konto uten andre roboter.
Velg en tilgjengelig Claude-modell med støtte for JSON structured outputs.
Alle beløp og grenser i boten er USD, ikke NOK. AAPL/MSFT er testinstrumenter.

PowerShell (verdiene gjelder denne terminalsesjonen):

```powershell
$env:ALPACA_PAPER_KEY="din-paper-key"
$env:ALPACA_PAPER_SECRET="din-paper-secret"
$env:ANTHROPIC_API_KEY="din-anthropic-key"
$env:CLAUDE_MODEL="modell-id-fra-anthropic"
$env:SYMBOLS="AAPL,MSFT"
python bot.py AAPL
```

Standardkommandoen henter ekte markedsdata og bruker Anthropic API, men sender
ingen ordre. For å sende simulerte ordre:

```powershell
python bot.py AAPL --execute-paper
python -m unittest -v
```

Kjør først manuelt mens amerikansk aksjemarked er åpent. For gjentatt kjøring kan
Windows Oppgaveplanlegging kjøre kommandoen hvert 15. minutt. Sett arbeidsmappen
til prosjektmappen og velg «ikke start ny forekomst» hvis oppgaven allerede kjører.
Oppgaveplanlegging arver ikke nødvendigvis miljøvariablene fra terminalen:
konfigurer hemmelighetene for brukeren/prosessen som faktisk kjører oppgaven.
Kjør kun én prosess/oppgave om gangen, også på tvers av symboler. Ikke legg nøkler
i kildekoden eller send dem til Claude Code/chatten. En .env-fil lastes ikke automatisk.

## Hva programmet gjør

- Henter IEX beste kjøps-/salgskurs, ferdige dagsbarer og inntil fem nyheter fra siste tre døgn.
- Beregner SMA20/SMA50 og ber Claude om BUY, SELL eller HOLD med begrunnelse.
- Validerer svaret, oppdaterer kurs/konto og beregner ordren i Python.
- Bruker hele aksjer, limitordre med gyldighet ut dagen, og kun eksisterende beholdning ved salg.
- Maks $500 og 10 % av egenkapital per ordre; kjøp begrenses også av kontanter,
  10 % per aksje og 50 % samlet bruttoeksponering.
- Blokkerer nye ordre ved 2 % kontotap relativt til brokerens last_equity,
  gamle kurser (>60 sek), spread >0,5 %, åpne ordre eller API-/datafeil.
- Maks tre ordreforsøk totalt per amerikansk børsdato, ett forsøk per symbol/dato.
  SQLite-reservasjon og stabil client_order_id beskytter mot gjentatt innsending.

## Backtest (ingen ordre sendes)

Dag D bruker kun barer lukket før D og nyheter publisert før børsåpning (09:30 NY)
på D. Fylling skjer på D sin åpningskurs + slippage og gebyr. Samme størrelsesgrenser
som `bot.py` ($500 / 10 % per ordre, kun long). Sammenlignes mot buy-and-hold.

```powershell
# Gratis: SMA20/SMA50-strategi
python backtest.py AAPL --start 2025-01-01 --end 2026-01-01 --slippage-bps 5 --fee-per-share 0.005
# Claude: svar caches i backtest_cache.sqlite, maks nye API-kall styres med --max-calls
python backtest.py AAPL --start 2025-01-01 --end 2025-06-01 --strategy claude --max-calls 50 --trades
# Offline data: --data fil.json med {"bars": [...], "news": [...]}
```

Merk: Claude-modellen kan ha treningsdata som dekker perioden (skjult look-ahead).
Resultater fra eldre perioder er derfor optimistiske. Første 50 barer er oppvarming.

## Stopp, feil og begrensninger

Lag en tom fil som heter STOP i prosjektmappen for å blokkere neste kjøring og
nye ordre etter Claude-analysen. STOP kansellerer ikke allerede innsendte ordre.
Kanseller disse i Alpaca-grensesnittet. Et svært kort kappløp rundt innsending er mulig.
Ved timeout under innsending: ikke slett state.sqlite eller prøv igjen blindt.
Sjekk ordrestatus i Alpaca via client_order_id. Reservasjonen beholdes også ved
avviste ordre; dette er bevisst konservativt. Ordrestatus lagres ved innsending,
men fyllinger overvåkes ikke kontinuerlig. En limitordre kan bli liggende ufylt.

Dagstapsgrensen er en sperre for nye ordre, ikke en stop-loss eller garanti for
maksimalt tap. Den inkluderer kontobevegelser og annen handel og blokkerer også
salg. Prototypen har ingen automatisk likvidering, stop-loss eller take-profit.
Bruk kontoen utelukkende til dette forsøket. IEX er én børs, ikke full konsolidert
markedsdata eller ordrebok. Tilgang til nyheter/data avhenger av kontoen; feil stopper
kjøringen. Ingen nyheter returnert betyr at Claude kun har kursgrunnlaget.

Strategien er et eksperiment og har ingen dokumentert lønnsomhet. Selvrapportert
AI-sikkerhet brukes ikke som sannsynlighet. Paper-fyllinger gjengir ikke nødvendigvis
likviditet, slippage, gebyrer eller reelle resultater. Det er ikke gjort backtest
eller fremoversimulering. Koden er ikke integrasjonstestet med ekte API-nøkler.

## Instruksjon til Claude Code for neste utviklingssteg

«Les bot.py, test_bot.py og README.md. Behold paper-only og dry-run som standard.
Bygg først replay/backtesting med tidsriktige historiske nyheter (ingen look-ahead),
slippage/gebyrer og sammenligning mot buy-and-hold. Legg deretter til ordre-/fill-
reconciliation, vedvarende revisjonslogg, API-kostnadsbudsjett og integrasjonstester
med mock-server, inkludert timeout etter mottatt ordre. Test at ingen doble ordre,
short eller marginbruk kan oppstå. Ikke legg til livehandel før megler, marked,
kapital og eksplisitte risikokrav er avklart.»

API-dokumentasjon:
https://docs.alpaca.markets/us/docs/paper-trading
https://docs.alpaca.markets/us/reference/stocklatestquotes-1
https://docs.alpaca.markets/us/reference/stockbars
https://docs.alpaca.markets/us/reference/news-3
https://docs.alpaca.markets/us/docs/working-with-orders
https://platform.claude.com/docs/en/build-with-claude/structured-outputs
