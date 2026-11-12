param([string]$ApiContainer = 'convoca-publicacion-api-api-1')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot
Push-Location $repoRoot
try {
    $envPath = Join-Path $repoRoot 'infra/hia/.env'
    if (!(Test-Path $envPath)) { throw 'Preparar infra/hia/.env siguiendo docs/base-datos.md.' }
    $raw = Get-Content $envPath -Raw
    foreach ($key in @('REPLICATION_PASSWORD','API_JWT_SECRET','GRAFANA_ADMIN_PASSWORD','MONITOR_DB_PASSWORD')) {
        if ($raw -notmatch "(?m)^$key=.+$") { $raw += "`n$key=$([guid]::NewGuid().ToString('N'))" }
    }
    [IO.File]::WriteAllText($envPath, $raw, [Text.UTF8Encoding]::new($false))
    $values = @{}
    foreach ($line in $raw -split "`n") {
        if ($line -match '^([A-Z_]+)=(.*)$') { $values[$matches[1]] = $matches[2].Trim().Trim('"', "'") }
    }
    foreach ($key in @('GRAFANA_ADMIN_PASSWORD','MONITOR_DB_PASSWORD')) {
        if ($values[$key].Length -lt 16 -or $values[$key] -match 'generar|cambiar|admin') { throw "Configurar $key con una clave propia de al menos 16 caracteres." }
    }
    if ($values.MONITOR_DB_PASSWORD -notmatch '^[a-zA-Z0-9_-]+$') { throw 'MONITOR_DB_PASSWORD: usar letras, números, guion o guion bajo.' }
    function DockerChecked([string[]]$Arguments) {
        & docker @Arguments
        if ($LASTEXITCODE -ne 0) { throw 'Falló un comando Docker; revisar la salida anterior.' }
    }
    & docker network inspect convoca-publicacion --format '{{.Name}}' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { DockerChecked @('network','create','convoca-publicacion') }
    $compose = @('compose','--env-file','infra/hia/.env','-f','infra/hia/docker-compose.yml','--profile','monitoreo')
    DockerChecked ($compose + @('up','-d','--wait','db-principal'))
    $db = (& docker @compose ps -q db-principal).Trim()
    if (!$db) { throw 'No se encontró el contenedor principal.' }
    $networks = & docker inspect $db --format '{{json .NetworkSettings.Networks}}'
    if ($networks -notmatch 'convoca-publicacion') { DockerChecked @('network','connect','--alias','db-principal','convoca-publicacion',$db) }
    # Se crea un usuario de solo monitoreo; la clave viaja por stdin, nunca en argumentos o logs.
    $password = $values.MONITOR_DB_PASSWORD
    $sql = "SELECT 'CREATE ROLE convoca_monitor LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='convoca_monitor')\gexec`nALTER ROLE convoca_monitor PASSWORD '$password';`nGRANT pg_monitor TO convoca_monitor;"
    $sql | & docker exec -i $db psql -X -v ON_ERROR_STOP=1 -U $values.POSTGRES_USER -d postgres | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar el usuario de monitoreo.' }
    & docker inspect $ApiContainer --format '{{.Name}}' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Levantar primero la API de A7/A9. Usar -ApiContainer si tiene otro nombre.' }
    DockerChecked @('start',$ApiContainer)
    $apiNetworks = & docker inspect $ApiContainer --format '{{json .NetworkSettings.Networks}}'
    if ($apiNetworks -notmatch 'convoca-publicacion') { DockerChecked @('network','connect','--alias','api','convoca-publicacion',$ApiContainer) }
    $statePath = Join-Path $repoRoot 'infra/hia/resultados/docker-state'
    New-Item -ItemType Directory -Force $statePath | Out-Null
    $pidFile = Join-Path $statePath 'collector.pid'
    if (Test-Path $pidFile) {
        $oldPid = [int](Get-Content $pidFile)
        $oldProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$oldPid"
        if ($oldProcess -and $oldProcess.CommandLine -like '*exportar-estado-docker.js*') { Stop-Process -Id $oldPid }
    }
    $collector = Start-Process -FilePath (Get-Command node).Source -ArgumentList @((Join-Path $repoRoot 'scripts/exportar-estado-docker.js')) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $statePath 'collector.out.log') -RedirectStandardError (Join-Path $statePath 'collector.err.log') -PassThru
    $collector.Id | Set-Content $pidFile
    DockerChecked ($compose + @('up','-d','prometheus','grafana','node-exporter','cadvisor','postgres-exporter','blackbox'))
    DockerChecked ($compose + @('exec','-T','prometheus','promtool','check','config','/etc/prometheus/prometheus.yml'))
    Write-Host 'Prometheus: http://localhost:9090 | Grafana: http://localhost:3001/d/convoca-a10'
    Write-Host 'Grafana: usuario admin; clave GRAFANA_ADMIN_PASSWORD en infra/hia/.env.'
} finally { Pop-Location }
