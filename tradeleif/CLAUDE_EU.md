# claude-trader – instrukser for Claude Code

Brukeren (Espen) styrer papirhandel-boten herfra på norsk. Svar kort. Kun simulerte penger.

## Kommandoer (kjør fra denne mappen, Windows PowerShell)
- Status / «dashboard i terminalen»: `.\.venv-eu\Scripts\python.exe -m eu_trader status`
- Sjekk oppsett: `.\.venv-eu\Scripts\python.exe -m eu_trader check`
- Én syklus nå: `.\.venv-eu\Scripts\python.exe -m eu_trader once`
- Kjedetest (børs må være åpen, US 15:30–22:00 norsk tid): `.\.venv-eu\Scripts\python.exe -m eu_trader e2e --symbol EQNR --qty 1`
- Start bot + web-dashboard i eget vindu: `Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','.\start_eu.ps1'`
- Web-dashboard alene: `Start-Process powershell -ArgumentList '-NoExit','-Command','.\.venv-eu\Scripts\python.exe -m eu_trader dashboard'` og åpne http://127.0.0.1:8765
- Tester: `.\.venv-eu\Scripts\python.exe -m pytest -q tests/test_eu_trader.py tests/test_alpaca_adapter.py tests/test_analyst.py`

## Innstillinger
`.env.eu` (aksjer, risikogrenser, ANALYST=claude_code|rules). Endre der, ikke i koden.
Nøkler: Windows-brukervariabler APCA_API_KEY_ID / APCA_API_SECRET_KEY. Vis aldri nøkler, skriv dem aldri i filer.

## Regler som ikke skal fjernes
- Kun paper: Alpaca paper-URL + konto PA..., IBKR port 4002/7497 + konto DU...
- Ingen livehandel, ingen pengeoverføring.
- Risikogrenser i `eu_trader/risk.py`, dedup via orderRef, fyllkontroll i `engine.py`.
- Den gamle `bot.py` skal ikke endres.

## Data
SQLite: `data/eu_trader.db` (tabeller decisions, orders, fills, errors, snapshots, runs).
