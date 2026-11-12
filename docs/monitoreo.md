# Monitoreo de Convoca (A10)

Continuación de backend #34/#47; la recuperación del proxy corresponde a frontend #24.

## Antes de empezar

Docker Desktop abierto y Node.js 22 instalado. Tener la base piloto de A4 migrada y cargada y la API de A7/A9 funcionando. Reutilizar `infra/hia/.env` de esa base: no cambiar `COMPOSE_PROJECT_NAME` ni borrar volúmenes. Usar el frontend con el proxy corregido en `fix/proxy-recuperacion-api` hasta integrar ese cambio en develop.

Los comandos siguientes se ejecutan en PowerShell, desde la raíz del backend. El monitoreo es optativo: no se inicia con `lab:up`. La primera descarga requiere Internet. Antes de activarlo, tener una clave propia `GRAFANA_ADMIN_PASSWORD` en `.env`; se puede generar con `[guid]::NewGuid().ToString('N')`. El contenedor se niega a arrancar con una clave menor a 16 caracteres.

## Levantar

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/levantar-monitoreo.ps1
node scripts/validar-monitoreo.js
```

El script agrega claves locales aleatorias si faltan, configura `convoca_monitor` con `pg_monitor`, arranca exportadores y valida la configuración con promtool. No imprime contraseñas. Si ya hay una clave de plantilla, reemplazarla por una propia de al menos 16 caracteres en `.env` (la clave del exportador acepta letras, números, guion y guion bajo).

También están disponibles `npm run monitor:up` y `npm run monitor:validate`; la interrupción controlada se ejecuta con `npm run monitor:validate -- --falla-controlada`.

La API de publicación tiene el nombre `convoca-publicacion-api-api-1`. Si se usa la API de desarrollo, averiguar su nombre con `docker ps` y pasar `-ApiContainer NOMBRE` al script; usar también `$env:MONITOR_API_CONTAINER='NOMBRE'` antes de validar. El script conecta la API y la base a la red compartida, manteniendo los datos existentes.

- Grafana: http://localhost:3001/d/convoca-a10 — usuario `admin`; clave `GRAFANA_ADMIN_PASSWORD` de `infra/hia/.env`.
- Prometheus: http://localhost:9090/targets y http://localhost:9090/alerts.
- Frontend de producción: http://localhost:8080. cAdvisor conserva su puerto interno 8080 y no lo publica en Windows.

Prometheus y Grafana solo se publican en `127.0.0.1`. Los exportadores no publican puertos. No incluir estas interfaces en el túnel de A9. Grafana conserva su contraseña inicial en su volumen: editar `.env` no rota una clave ya inicializada; hacerlo desde Grafana si fuera necesario, sin borrar el volumen.

## Qué observar

El dashboard se aprovisiona desde `infra/hia/grafana/`; no requiere importación manual. Incluye CPU, memoria y disco de la VM Linux de Docker Desktop; CPU, memoria, red y última observación de contenedores; cambios del instante de arranque durante 30 minutos; disponibilidad de API y PostgreSQL; conexiones y consultas activas de más de un segundo; cantidad de réplicas y retraso WAL.

También incluye estado real ejecutando/detenido y `RestartCount` del motor. Un proceso Node local (`scripts/exportar-estado-docker.js`) consulta únicamente nombre, ejecución y reinicios cada 15 segundos. node-exporter lee el archivo de métricas, no recibe acceso adicional al socket Docker. El proceso se inicia oculto e idempotente desde el script PowerShell; su PID y logs se guardan en `infra/hia/resultados/docker-state/`. Una alerta detecta muestras antiguas y los paneles descartan datos de más de 45 segundos. `RestartCount` cuenta reinicios automáticos del motor, mientras los cambios de instante de arranque muestran reinicios observados en la ventana.

En Docker Desktop las métricas del sistema corresponden a su VM Linux, no al sistema Windows completo. Los cambios del instante de arranque detectan reinicios observados durante la ventana: no constituyen un contador histórico permanente de reinicios Docker. El panel `última observación` tampoco sustituye la salud funcional; esta se mide con la sonda HTTP.

`pg_stat_activity` identifica consultas activas que superan un segundo; no informa el historial ni el texto de consultas lentas finalizadas. Para ese análisis se conserva pgBadger de A4. El exportador usa consultas adicionales versionadas en `queries.yml`; su mecanismo extendido está deprecado por upstream, pero se valida con la versión fijada. No actualizar imágenes sin repetir la validación.

La consulta de réplica observa `pg_stat_replication` desde el principal. Cero réplicas significa ninguna conectada; el retraso queda vacío, nunca se interpreta como sincronización. Para ver retraso hay que levantar la réplica de A6 con `npm run lab:replica-up` y volver a conectar el principal a la red compartida si Compose lo recrea, ejecutando el script de arranque.

## Alertas y prueba controlada

La sonda consulta `/api/health`: exige HTTP 200 y `database: up`. Una base caída devuelve HTTP 503 sin exponer mensajes internos. Se eliminaron la versión y el commit fijos que no representaban el despliegue: si no se proporcionan por entorno aparecen como `null`.

Las reglas avisan por API/base indisponibles, exportadores caídos y disco libre inferior al 10%. Las tres primeras requieren 30 segundos para evitar avisos transitorios; disco requiere cinco minutos. Scrape y evaluación cada 15 segundos: la detección y recuperación no son instantáneas.

```powershell
node scripts/validar-monitoreo.js --falla-controlada
```

Usar solo en laboratorio y avisar al equipo: este comando detiene temporalmente el principal y luego la API. Comprueba `firing` de ambas alertas durante la caída de base; recupera y espera su desaparición. Luego detiene la API, verifica su alerta y que PostgreSQL siga disponible, y la recupera sin reiniciar frontend. Los servicios detenidos se arrancan en bloques `finally`, incluso ante un error de comprobación; no cerrar por fuerza el proceso. Si se interrumpiera la terminal, ejecutar el script de arranque y validar nuevamente.

No se borran datos ni volúmenes. Los resultados JSON con muestras de estados, alertas y consultas del dashboard se guardan en `infra/hia/resultados/*-monitoreo/validacion.json`. Guardar capturas reales de Grafana, Targets y Alerts junto con ese archivo. Las alertas son visibles en Prometheus; esta etapa no configura envío de correo ni integración con GLPI/n8n, que corresponde a A13.

## Detener solo monitoreo

```powershell
docker compose --env-file infra/hia/.env -f infra/hia/docker-compose.yml --profile monitoreo stop prometheus grafana node-exporter cadvisor postgres-exporter blackbox
```

La API, frontend, base y datos quedan disponibles. Nunca usar `down -v` para detener esta práctica.

Para detener también el recolector local, consultar `infra/hia/resultados/docker-state/collector.pid` y detener ese proceso Node (comprobar que su comando sea `exportar-estado-docker.js`). El script de arranque ya evita duplicarlo al ejecutarse nuevamente.
