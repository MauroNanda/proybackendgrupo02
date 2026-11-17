# A13 — Automatizaciones de Convoca

Se trabaja en el **backend**. Abrir su carpeta en VS Code y usar **Terminal → Nueva terminal**, con PowerShell. Tener Docker Desktop abierto y Node.js 22 o posterior. No se necesita instalar Python: corre en Docker.

## 1. Antes de empezar

Se reutilizan A4 (base y backup), A10 (Prometheus), A11 (Mantis) y A12 (Nextcloud). Las claves pertenecen a la instalación local; no copiar las de otra persona ni subir `.env`.

**Si ya están preparados:** iniciar esos servicios con sus instructivos. No repetir migraciones ni carga de datos. Comprobar:

```powershell
docker ps
npm run lab:validate -- --perfil piloto
```

La validación debe mostrar **1.000 usuarios, 100 eventos y 10.000 inscripciones**. A13 opera solo sobre este piloto; conserva la carga completa.

**Si este es un clon nuevo:** seguir primero la preparación de `docs/GUIA_DEMOSTRACION.md` y `docs/base-datos.md`: crear `infra/hia/.env`, instalar dependencias y preparar **solo el piloto**:

```powershell
npm ci
npm run lab:up
npm run lab:migrate -- --perfil piloto
npm run lab:seed -- --perfil piloto
npm run lab:validate -- --perfil piloto
```

Levantar la API y A10 con las claves locales de `infra/hia/.env` ya completadas:

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --build api
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/levantar-monitoreo.ps1 -ApiContainer convoca-lab-v2-api-1
npm run mantis:up
npm run nextcloud:up
```

Si se cambió `COMPOSE_PROJECT_NAME`, reemplazar `convoca-lab-v2-api-1` por el nombre que muestra `docker ps`. En instalaciones existentes, reconstruir Mantis desde esta rama para incorporar la restricción REST de A13. Sus usuarios y tickets se conservan en el volumen.

Antes de continuar deben abrir: Prometheus en `http://localhost:9090`, Mantis en `http://localhost:8989` y Nextcloud en `http://localhost:8082`. En Nextcloud, `usuario4` debe poder escribir en `Convoca - Trabajo/Informe`.

## 2. Preparar A13 una sola vez

Desde la misma terminal del backend:

```powershell
node scripts/n8n-lab.js preparar
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/levantar-automatizaciones.ps1
```

La preparación genera claves privadas y una cuenta técnica de Mantis, toma la clave local de `usuario4` desde `infra/nextcloud/.env` y carga las credenciales cifradas en n8n. No imprime contraseñas. Si ya existen, las conserva.

Abrir:

- **n8n:** `http://localhost:5680`. Usuario `admin@convoca.local`; contraseña `N8N_ADMIN_PASSWORD` en `infra/n8n/.env`.
- **Bandeja de avisos:** `http://localhost:8028`. Es Mailpit local: recibe los mensajes del laboratorio, **no entrega correos por Internet**.

Los tres flujos se importan y publican automáticamente. El primero consulta Prometheus cada 30 segundos. Los otros se ejecutan a pedido, para no generar backups ni restauraciones periódicas sin intención.

Para próximos arranques, iniciar primero A4/A10/A11/A12 y repetir **solo** `levantar-automatizaciones.ps1`. Este comando conserva los flujos, credenciales y estado de incidencias; evita ejecutar dos runners. Tras modificar las exportaciones, usar el mismo script con `-Importar`.

## 3. Qué hace cada flujo

| Flujo | Disparador y condición | Acciones y resultado |
|---|---|---|
| 1. Alertas | Consulta real de las alertas `firing` de Prometheus cada 30 s; también admite webhook autenticado | Crea ticket privado de disponibilidad/rendimiento en Mantis y avisa. Mientras siga la misma alerta, conserva el ID y evita duplicados. Al desaparecer, resuelve ese ticket y avisa la recuperación. |
| 2. Backup | Webhook autenticado solicitado por el operador | Invoca el procedimiento de A4, comprueba manifiesto y SHA-256 y avisa. Una entrada separada permite restaurar la última copia piloto en una base temporal, exigiendo `aprobado: true`. Nunca restaura sobre la base original. |
| 3. Informe | Webhook autenticado solicitado por el operador | Python consulta disponibilidad y recursos de Prometheus, genera Markdown, n8n lo sube a `Convoca - Trabajo/Informe` de Nextcloud y avisa. Datos incompletos o error de almacenamiento producen un aviso de error. |

Circuitos: **Prometheus → n8n → Mantis → correo local**; **n8n → procedimiento A4 → verificación → correo local**; **Prometheus → Python → n8n → Nextcloud → correo local**.

## 4. Probar y mostrar

Prueba normal y errores controlados, desde PowerShell en el backend:

```powershell
node scripts/n8n-validar.js
```

Prueba adicional de restauración: usarla **solo cuando se decide restaurar en una base temporal piloto**. El parámetro representa la aprobación explícita del operador:

```powershell
node scripts/n8n-validar.js --restaurar
```

El validador entra a n8n, llama a sus webhooks reales y comprueba los nodos recorridos. Guarda un resumen sin claves en `infra/n8n/resultados/validacion.json`. Incluye rechazo sin autenticación, backup correcto, perfil inválido, restauración sin aprobación, informe correcto, datos incompletos, carpeta inexistente y estado de alerta inválido. Con `--restaurar`, verifica la restauración temporal de la misma copia y su hash.

En el navegador, abrir **n8n → flujo → Executions → ejecución**. Mostrar el recorrido y, en Mailpit, los avisos recibidos. En Nextcloud, abrir el informe recién generado. En `infra/hia/backups` quedan el dump, su hash, manifiesto y resultado de restauración; **no compartir el dump ni el `.env`**.

Para demostrar el flujo 1, elegir en `docker ps` el contenedor `postgres-exporter` del laboratorio. Detener **solo ese exportador** con `docker stop NOMBRE`, esperar la alerta `ConvocaExportadorCaido` en Prometheus y la siguiente ejecución de n8n. Mostrar el ticket y aviso. Iniciarlo con `docker start NOMBRE`; esperar el siguiente scrape y consulta de n8n y mostrar el mismo ticket resuelto. Puede tomar 45–90 s por las reglas de A10. No detener PostgreSQL ni borrar volúmenes. Si otras alertas reales ya estaban activas, sus tickets aparecen por separado.

## 5. Controles y límites

- Entradas con `X-A13-Token` y runner con `Bearer`; claves locales excluidas de Git. Las exportaciones contienen referencias a credenciales, sin valores secretos.
- Administrador protegido; n8n y correo publicados solo en `127.0.0.1`. Conservar **juntos** el volumen de n8n y su `N8N_ENCRYPTION_KEY`; no regenerar la clave sobre un volumen existente.
- REST de Mantis admite únicamente la IP de n8n en la red dedicada `192.168.241.0/24`, y además exige token. La cuenta técnica tiene acceso de desarrollo al proyecto Convoca, sin administración global. `/admin` y SOAP siguen bloqueados. Si esa subred ya existe, no cambiar una IP suelta: ajustar Compose, Apache y la CLI conjuntamente.
- El runner escucha en loopback, limita tamaño de entrada, operaciones y perfil; no acepta comandos ni rutas enviados por el solicitante. Docker Desktop permite llegar a él desde n8n mediante `host.docker.internal`. n8n no recibe el socket de Docker.
- Python tiene límites de CPU/memoria, raíz de solo lectura y sin capacidades. No necesita IA ni servicios pagos. Sus métricas corresponden a la VM de Docker, no a todo Windows; conserva cada destino aunque varios compartan el mismo job.
- Ejecuciones de n8n retenidas 14 días, incluidos errores; `infra/n8n/runner.log` registra operaciones y rechazos. SMTP reintenta tres veces; si falla, la ejecución conserva `aviso_pendiente`. Reenviar **solo el aviso**, sin repetir una operación crítica. La consola de monitoreo no sustituye una guardia ni una solución productiva de alta disponibilidad.
- Si el runner apunta a otra copia local del mismo laboratorio, configurar `N8N_LAB_ROOT` en su `.env` para que use el mismo directorio de backups montado en PostgreSQL. Por defecto usa este clon.

## 6. Detener

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/detener-automatizaciones.ps1
```

Esto detiene n8n, Mailpit y el runner conservando los volúmenes. El script verifica que el PID corresponda al runner antes de detenerlo. No usar `down -v`: elimina la persistencia.

Referencias: [CLI de n8n](https://docs.n8n.io/hosting/cli-commands/), [copia y clave de cifrado](https://docs.n8n.io/hosting/scaling/backup-and-restore/), [API REST oficial de Mantis](https://github.com/mantisbt/mantisbt/blob/master/docbook/Developers_Guide/en-US/Api_Rest.xml).
