param([switch]$Importar)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
    & docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Abrir Docker Desktop y esperar a que inicie el motor.' }
    if (!(Test-Path 'node_modules/dotenv')) { throw 'Ejecutar npm ci antes de continuar.' }
    if (!(Test-Path 'infra/n8n/.env')) { throw 'Completar la preparacion de docs/AUTOMATIZACIONES_A13.md primero.' }
    $values = @{}
    foreach ($line in Get-Content 'infra/n8n/.env') {
        if ($line -match '^([A-Z0-9_]+)=(.*)$') { $values[$matches[1]] = $matches[2].Trim() }
    }
    $port = if ($values.N8N_RUNNER_PORT) { [int]$values.N8N_RUNNER_PORT } else { 5681 }
    $outDir = Join-Path $repoRoot 'infra/n8n/resultados'
    New-Item -ItemType Directory -Force $outDir | Out-Null
    $pidPath = Join-Path $outDir 'runner.pid'
    if (Test-Path $pidPath) {
        $previousId = [int](Get-Content $pidPath)
        $previous = Get-CimInstance Win32_Process -Filter "ProcessId=$previousId"
        if ($previous -and $previous.CommandLine -like '*scripts/n8n-runner.js*') { Stop-Process -Id $previousId }
    }
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "El puerto $port esta ocupado. No se detiene otro proceso." }
    $runner = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/n8n-runner.js' -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $outDir 'runner.out.log') -RedirectStandardError (Join-Path $outDir 'runner.err.log') -PassThru
    $runner.Id | Set-Content $pidPath
    & node scripts/n8n-lab.js $(if ($Importar) { 'importar' } else { 'up' })
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la configuracion de n8n; revisar la salida.' }
    Write-Host 'n8n: http://localhost:5680 | Bandeja local: http://localhost:8028'
    Write-Host 'A4, A10, A11 y A12 deben estar iniciadas. Ver docs/AUTOMATIZACIONES_A13.md.'
} finally { Pop-Location }
