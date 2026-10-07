# Oppsett. Kjør fra prosjektmappen. Nøkler leses skjult og lagres som Windows-brukervariabler, aldri i filer.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$py = '.\.venv-eu\Scripts\python.exe'
if (-not (Test-Path $py)) { py -3.13 -m venv .venv-eu }
& $py -m pip install -q --upgrade pip
& $py -m pip install -q -r requirements-eu.txt
if (-not (Test-Path '.env.eu')) { Copy-Item '.env.eu.example' '.env.eu'; Write-Host 'Laget .env.eu (innstillinger, ingen hemmeligheter).' }

function Les-Hemmelighet([string]$navn, [string]$tekst, [int]$min) {
    $sec = Read-Host $tekst -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
    if ($v.Length -lt $min) { throw "$navn ser for kort ut. Ingenting lagret." }
    [Environment]::SetEnvironmentVariable($navn, $v, 'User')
    Set-Item -Path "Env:$navn" -Value $v
    Write-Host "$navn lagret som Windows-brukervariabel."
}

foreach ($n in 'APCA_API_KEY_ID','APCA_API_SECRET_KEY') {
    $v = [Environment]::GetEnvironmentVariable($n, 'User'); if ($v) { Set-Item -Path "Env:$n" -Value $v }
}

# Gjenbruk nøkler satt i denne PowerShell-økten av den gamle boten, og lagre dem permanent
if ($env:ALPACA_PAPER_KEY -and $env:ALPACA_PAPER_SECRET -and -not $env:APCA_API_KEY_ID) {
    [Environment]::SetEnvironmentVariable('APCA_API_KEY_ID', $env:ALPACA_PAPER_KEY, 'User')
    [Environment]::SetEnvironmentVariable('APCA_API_SECRET_KEY', $env:ALPACA_PAPER_SECRET, 'User')
    $env:APCA_API_KEY_ID = $env:ALPACA_PAPER_KEY; $env:APCA_API_SECRET_KEY = $env:ALPACA_PAPER_SECRET
    Write-Host 'Alpaca-nøkler fra denne økten lagret som Windows-brukervariabler.'
}
$harAlpaca = & $py -c "from eu_trader.config import Config;c=Config();print(1 if c.alpaca_key and c.alpaca_secret else 0)"
if ($harAlpaca -ne '1') {
    Les-Hemmelighet 'APCA_API_KEY_ID' 'Lim inn Alpaca PAPER Key ID (vises ikke)' 10
    Les-Hemmelighet 'APCA_API_SECRET_KEY' 'Lim inn Alpaca PAPER Secret Key (vises ikke)' 20
} else { Write-Host 'Alpaca-nøkler funnet.' }

# Claude via abonnement (Claude Code). API-nøkkel trengs ikke.
if (Test-Path '.env.eu') {
    $e = Get-Content '.env.eu' -Raw
    if ($e -notmatch '(?m)^ANALYST=') { Add-Content '.env.eu' "`nANALYST=claude_code`nCLAUDE_CODE_MODEL=sonnet" ; Write-Host 'La til ANALYST=claude_code i .env.eu.' }
}
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host 'ADVARSEL: Claude Code (claude) ble ikke funnet. Boten bruker da regelbasert reserve.' -ForegroundColor Yellow
} else { Write-Host ('Claude Code funnet: ' + (& claude --version)) }
if ([Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY','User')) {
    $svar = Read-Host 'En lagret ANTHROPIC_API_KEY ble avvist som ugyldig tidligere. Fjerne den? (J/n)'
    if ($svar -ne 'n') { [Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $null, 'User'); Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue; Write-Host 'Fjernet.' }
}

& $py -m pytest -q -p no:cacheprovider tests/test_eu_trader.py tests/test_alpaca_adapter.py tests/test_analyst.py
& $py -m eu_trader check
