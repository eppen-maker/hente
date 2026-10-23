# Starter dashboard (eget vindu) og boten. Ctrl+C stopper boten.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
foreach ($n in 'APCA_API_KEY_ID','APCA_API_SECRET_KEY') {
    $v = [Environment]::GetEnvironmentVariable($n, 'User'); if ($v) { Set-Item -Path "Env:$n" -Value $v }
}
Start-Process -FilePath '.\.venv-eu\Scripts\python.exe' -ArgumentList '-m','eu_trader','dashboard' -WorkingDirectory $PSScriptRoot
Start-Sleep 2
Start-Process 'http://127.0.0.1:8765'
& .\.venv-eu\Scripts\python.exe -m eu_trader run
