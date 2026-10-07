# EU Trader – papirhandel: steg 1 Alpaca (europeiske ADR-er i USA), steg 2 Oslo Børs via IBKR

Kun simulerte penger. Alpaca: hardkodet `paper=True` + krav om kontonummer `PA...`. IBKR: kun port 4002/7497 + konto `DU...`.
Bytt marked ved å endre blokkene i `.env.eu` (steg 1 → steg 2). Koden er den samme.
`BROKER=localsim` er LOKAL SIMULERING: ingen megler er involvert, og ingenting vises hos IBKR eller Alpaca.

## Kommandoer (fra prosjektmappen)
| Kommando | Hva |
|---|---|
| `.\.venv-eu\Scripts\python.exe -m eu_trader check` | Sjekker kalender, megler/paper-konto, pris, Claude-modell |
| `... -m eu_trader once` | Én syklus nå (HOLD hvis børsen er stengt) |
| `... -m eu_trader run` | Kjører hvert 15. min i børsens åpningstid (kalender fra `EXCHANGE_CALENDAR`), sover på helger/helligdager |
| `... -m eu_trader dashboard` | http://127.0.0.1:8765 |
| `... -m eu_trader e2e --symbol EQNR --qty 1` | Full kjedetest: data → Claude → kjøp → bekreftet fylling → beholdning → salg tilbake |

## Sikkerhet i koden
- Risikogrenser: maks ordreverdi, posisjon, total eksponering, ordre per aksje/dag, totalt/dag, daglig tapsgrense (stopper kjøp, salg tillatt), cooldown, ingen kjøp siste 20 min, ingen shorting.
- Dobbeltordre-vern: unik `orderRef` per 15-min slot + aksje + side (DB-nøkkel), sjekk av åpne ordre hos megler.
- Fyllkontroll: venter på status, kansellerer rest etter tidsavbrudd, avstemmer mot meglerens eksekveringer (`reqExecutions`) før og etter hver syklus.
- Alt logges i `data/eu_trader.db` (beslutninger, ordre, fyllinger, feil, snapshots).

## Avhengigheter
Kun rene Python-pakker (python-dotenv, tzdata, pytest). Alpaca og Claude kalles med standardbibliotekets HTTPS. Ingen pandas/numpy/pydantic, så Windows programkontroll har ingen DLL-er å blokkere. `requirements-ibkr.txt` trengs først i steg 2.
