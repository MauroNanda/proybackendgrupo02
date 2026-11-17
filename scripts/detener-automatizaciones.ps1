$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
    & node scripts/n8n-lab.js stop
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener el Compose de A13.' }
    $pidPath = Join-Path $repoRoot 'infra/n8n/resultados/runner.pid'
    if (Test-Path $pidPath) {
        $runnerId = [int](Get-Content $pidPath)
        $runner = Get-CimInstance Win32_Process -Filter "ProcessId=$runnerId"
        if ($runner -and $runner.CommandLine -like '*scripts/n8n-runner.js*') { Stop-Process -Id $runnerId }
    }
    Write-Host 'A13 detenido. Volumenes, datos y claves conservados.'
} finally { Pop-Location }
