# Convoca: levantar el proyecto y mostrar los avances

Guía central para el equipo, basada en `develop` de backend y frontend. El recorrido principal usa una base local pequeña: no requiere Neon, cuentas de servicios externos ni cargar seis millones de filas.

## Orden de arranque

Seguir este orden, sin saltear el backend:

1. **Abrir Docker Desktop** y esperar que el motor esté listo.
2. **Preparar la base local** desde la carpeta del backend: configuración, tablas y datos, la primera vez.
3. **Levantar el backend y la base** con Docker Compose y comprobar que respondan.
4. **Levantar el frontend** en otra terminal.
5. **Abrir la aplicación en el navegador** y probar las funcionalidades.

**Abrir Docker Desktop no levanta por sí solo Convoca.** PostgreSQL, pgAdmin y el backend se inician con los comandos siguientes; el frontend se inicia por separado con `npm start`. El backend también se llama **API** en esta guía.

**Elegir un solo recorrido después de los apartados 1 y 2:**

| Estado de este equipo | Recorrido |
|---|---|
| Ya tiene `infra/hia/.env`, migraciones y datos del piloto cargados | **A: entorno ya preparado**. |
| No tiene la base local o todavía no ejecutó las migraciones | **B: preparar desde cero**. |
| Tiene las migraciones, pero todavía no cargó los datos | **B**, conservando su `.env`. El comando de migración solo aplica las pendientes; luego cargar el piloto. |

Tener las migraciones **como archivos en Git** no significa haberlas ejecutado. La base debe existir en Docker en este equipo. Esta guía usa `convoca_lab_piloto_v2`; una base migrada en Neon o la base `convoca_lab_v2` del perfil completo no sustituye ese piloto.

## 1. Abrir Docker Desktop

Tener instalados **Git, Node.js 22.22.3 o superior y Docker Desktop**. Abrir Docker Desktop desde Windows y esperar a que indique que el motor Linux está funcionando. Mantenerlo abierto durante toda la demostración.

Abrir una terminal **PowerShell**. Los comandos de esta guía se escriben allí, no en DBeaver ni dentro de un contenedor.

## 2. Obtener los dos repositorios

Si todavía no tienen los repositorios, abrir PowerShell en la carpeta donde quieran guardarlos y ejecutar:

```powershell
git clone --branch develop https://github.com/MauroNanda/proybackendgrupo02.git
git clone --branch develop https://github.com/MauroNanda/proyfrontendgrupo02.git
cd proybackendgrupo02
```

Si ya los tienen, conservar los cambios propios y actualizar `develop` en **cada repositorio** con `git switch develop` y `git pull --ff-only origin develop`. No clonar nuevamente ni descartar cambios para seguir esta guía.

## A. Ya tengo las migraciones y los datos cargados

Usar este recorrido si el piloto ya funcionó en este equipo y se conservaron su archivo `infra/hia/.env` y los volúmenes Docker. **No volver a generar claves, migrar ni cargar datos para un arranque normal.**

### A1. Levantar base y backend

Con Docker Desktop abierto, abrir **Terminal 1 en `proybackendgrupo02`** y ejecutar:

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --build --wait
```

Esperar a que termine. Este comando inicia **PostgreSQL, pgAdmin y el backend** conservando la base existente. `--build` incorpora el código actualizado del backend. Después comprobarlo:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Debe responder **`status: ok` y `database: up`**. No ejecutar `npm start` ni `npm run dev` en el backend: ya está en Docker.

### A2. Levantar el frontend

Abrir **Terminal 2 en `proyfrontendgrupo02`** y ejecutar:

```powershell
npm start
```

Si faltan las dependencias o cambió `package-lock.json` al actualizar el repositorio, ejecutar primero `npm ci` en esa misma carpeta. Esperar la compilación y **dejar esta terminal abierta**.

### A3. Abrir y mostrar

Abrir **http://localhost:4200**. Continuar en **Accesos y cuentas para ambos recorridos**, y luego en el apartado 7 para mostrar las funcionalidades. **No ejecutar el recorrido B.**

Si existen tablas pero nunca se cargó el piloto, usar B. Si lo que falla es una contraseña de una instalación anterior, conservar la base y revisar la configuración; no reinicializarla para resolverlo. Si hay nuevas migraciones incorporadas al actualizar `develop`, aplicar las pendientes con la base levantada mediante `npm run lab:migrate -- --perfil piloto` desde el backend antes de continuar.

## B. No tengo las migraciones ejecutadas: preparar desde cero

Seguir B1 a B4 en orden. Si ya tienen las tablas pero faltan los datos, este recorrido también sirve: conserva el `.env` existente, las migraciones aplicadas no se repiten y el seed del piloto es reanudable.

### B1. Preparar la base local

**Terminal 1, dentro de `proybackendgrupo02`**, donde están `package.json` e `infra`. Si clonaron con el bloque anterior, ya están en esa carpeta. Ejecutar cada comando por separado y esperar a que termine; si falla, resolverlo antes de continuar.

```powershell
npm ci
```

Crear la configuración local. Este bloque solo crea el archivo si no existe y genera claves distintas para este equipo:

```powershell
if (-not (Test-Path infra/hia/.env)) {
    $config = Get-Content infra/hia/.env.example -Raw
    foreach ($clave in @('POSTGRES_PASSWORD','PGADMIN_PASSWORD','REPLICATION_PASSWORD','API_JWT_SECRET','GRAFANA_ADMIN_PASSWORD','MONITOR_DB_PASSWORD')) {
        $valor = [guid]::NewGuid().ToString('N')
        $config = [regex]::Replace($config, "(?m)^$clave=.*$", "$clave=$valor")
    }
    [IO.File]::WriteAllText((Join-Path (Get-Location) 'infra/hia/.env'), $config, [Text.UTF8Encoding]::new($false))
}
```

Si el archivo ya existía, se conserva: usar las claves de esa instalación. Reemplazar los valores `generar-una-clave-aleatoria-local` que todavía queden, especialmente `API_JWT_SECRET`. Editar una contraseña de PostgreSQL no cambia la de un volumen ya creado. **No subir `.env` a Git.**

```powershell
npm run lab:up
npm run lab:migrate -- --perfil piloto
npm run lab:seed -- --perfil piloto
npm run lab:validate -- --perfil piloto
```

`lab:up` levanta PostgreSQL y pgAdmin. `lab:migrate` crea la base y las tablas; `lab:seed` carga los datos y las cuentas; `lab:validate` comprueba el resultado. **En este punto el backend todavía no está levantado.**

**Resultado esperado:** base `convoca_lab_piloto_v2` con 1.000 usuarios, 100 eventos y 10.000 inscripciones. Las migraciones por sí solas no crean las cuentas de demostración.

El seed se puede repetir sin duplicar sus datos; si encuentra datos incompatibles, se detiene. No borrar la base para forzarlo. Para la demostración alcanza el piloto: la carga completa de A4 se hace aparte siguiendo [base-datos.md](base-datos.md).

### B2. Levantar el backend y comprobarlo

**En la misma Terminal 1, todavía dentro de `proybackendgrupo02`:**

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --build --wait
```

Este comando construye e inicia **el backend dentro de Docker** y mantiene PostgreSQL y pgAdmin funcionando. La primera construcción puede demorar varios minutos. Esperar que termine y ejecutar:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

**Debe responder `status: ok` y `database: up`.** Recién entonces continuar. No ejecutar `npm run dev` ni `npm start` en el backend: ya está corriendo en Docker. La Terminal 1 queda libre para las consultas y los comandos de infraestructura.

### B3. Levantar el frontend en otra terminal

Abrir **una segunda terminal PowerShell** y entrar en la carpeta **`proyfrontendgrupo02`**. Comprobar que sea la del frontend, no la del backend. Allí ejecutar:

```powershell
npm ci
npm start
```

Esperar a que termine de compilar y muestre la dirección `http://localhost:4200`. **Dejar esta Terminal 2 abierta y con el proceso ejecutándose.** No hace falta crear un `.env` del frontend: en desarrollo ya consulta `http://localhost:3000/api`.

### B4. Abrir la aplicación

Con Docker Desktop abierto, el backend saludable y el frontend compilado, abrir el navegador en **http://localhost:4200**. Ya deberían verse los eventos del catálogo y poder iniciar sesión.

En este momento están funcionando tres partes: **base y backend dentro de Docker, y frontend en la Terminal 2**.

## Accesos y cuentas para ambos recorridos

| Acceso | Dirección / credenciales |
|---|---|
| Aplicación | http://localhost:4200 |
| Salud de API | http://localhost:3000/api/health |
| Organizador | `lab.1@convoca.test` / `DemoConvoca2026!` |
| Asistente | `lab.2@convoca.test` / `DemoConvoca2026!` |
| pgAdmin | http://localhost:5050; email y clave `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` de `infra/hia/.env` |

Estas dos cuentas pertenecen al **piloto sintético local**. No usar las cuentas `admin/laura` de otras guías: corresponden a otro seeder. Los demás usuarios del piloto no tienen una contraseña de acceso.

## 7. Qué mostrar: recorrido de la aplicación

Usar una ventana normal para el organizador y una de incógnito para el asistente; así las sesiones no se pisan. Los eventos sintéticos tienen fechas fijas: crear uno futuro para probar inscripciones hoy.

| Paso | Qué hacer | Qué debería verse |
|---|---|---|
| 1. Catálogo | Entrar sin sesión y buscar un evento por su título. Abrir su tarjeta. | Catálogo público y detalle con fecha, lugar y cupo. |
| 2. Organizador | Iniciar sesión con `lab.1@convoca.test`; abrir `/admin/eventos` y crear un evento. Usar título `Demo avances`, **descripción completa**, lugar `Laboratorio`, fecha futura, cupo `10` y estado `PUBLICADO`. | Evento creado y visible en el catálogo. Completar descripción mientras su corrección de A11 no esté integrada. |
| 3. Asistente | En incógnito, iniciar sesión con `lab.2@convoca.test`, buscar `Demo avances` y pulsar inscribirse. | Inscripción confirmada; aparece en **Mis inscripciones** (`/mis-inscripciones`) y permite ver el pase QR. |
| 4. Administración | Volver al organizador, abrir los inscriptos del evento y registrar la asistencia manualmente. | El asistente pasa a `ASISTIO`. Es una alternativa al escaneo QR para mostrar el circuito sin cámara. |
| 5. Dashboard | Como organizador, entrar a `/admin/dashboard`. | Estadísticas y gráficos obtenidos de la base local. |
| 6. Permisos | Desde la sesión del asistente intentar entrar a `/admin/dashboard`. | No obtiene acceso al panel de organizador. |

Para mostrar **cancelación de inscripción**, hacerlo antes de marcar asistencia o crear otro evento de demostración. Para mostrar **lista de espera**, crear un evento de cupo `1` e inscribir a dos asistentes distintos; el segundo queda en espera. Se puede crear el segundo usuario desde el registro público. La cancelación del confirmado libera el cupo y permite comprobar la promoción del que esperaba.

Estos pasos agregan datos al piloto. Para recuperar los totales originales, el organizador puede eliminar **solo los eventos creados para la demo** desde `/admin/eventos`: también se eliminan sus inscripciones. Cancelar una inscripción conserva su fila y no restaura los totales. Si crearon usuarios adicionales, los totales de usuarios también cambian. No ejecutar `TRUNCATE`, borrar volúmenes ni repetir la migración para limpiar una demo.

## 8. Qué mostrar: avances de infraestructura

Estos apartados son opcionales y se ejecutan desde **Terminal 1, raíz del backend**, con la API y la base funcionando.

### A4: base, respaldo y restauración

En pgAdmin, registrar un servidor con host `db-principal`, puerto `5432`, usuario y clave `POSTGRES_USER` / `POSTGRES_PASSWORD`. Abrir `convoca_lab_piloto_v2` para mostrar las tablas. Desde DBeaver el host es `localhost` y el puerto `5435`.

Antes de modificar datos para la demo, se puede comprobar el respaldo y su restauración:

```powershell
npm run lab:backup -- --perfil piloto
npm run lab:restore-test -- --perfil piloto
```

La restauración se verifica en una base temporal, sin reemplazar la original. Backups en `infra/hia/backups/`; resultados en `infra/hia/resultados/`. Para análisis SQL y pgBadger: [base-datos.md](base-datos.md). Las mediciones de la carga completa no se sustituyen por las del piloto.

### A6: réplica PostgreSQL

```powershell
npm run lab:replica-up
docker compose --env-file infra/hia/.env -f infra/hia/docker-compose.yml exec -T db-principal psql -X -U convoca_lab -d postgres -c "SELECT application_name, state, sync_state FROM pg_stat_replication;"
```

Mostrar una réplica en `streaming`. Si cambiaron `POSTGRES_USER`, sustituir `convoca_lab` en la consulta. La API sigue usando el principal; no hay failover automático. Detalles de recuperación: [replicacion-postgresql.md](replicacion-postgresql.md).

### A10: monitoreo

Identificar automáticamente la API de este Compose y levantar el monitoreo:

```powershell
$api = docker compose --env-file infra/hia/.env -f infra/compose.yaml ps -q api
$env:MONITOR_API_CONTAINER = (docker inspect $api --format '{{.Name}}').Trim().TrimStart('/')
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/levantar-monitoreo.ps1 -ApiContainer $env:MONITOR_API_CONTAINER
npm run monitor:validate
```

Abrir **http://localhost:3001/d/convoca-a10**: usuario `admin`, clave `GRAFANA_ADMIN_PASSWORD` del archivo local. Mostrar disponibilidad de API/base y métricas de contenedores. En **http://localhost:9090/targets**, los cinco destinos deberían estar `UP`. Esperar aproximadamente un minuto para las primeras muestras.

Para mostrar caída y recuperación, avisar antes: el siguiente comando interrumpe temporalmente la base y la API y luego las recupera. No requiere reiniciar Angular.

```powershell
npm run monitor:validate -- --falla-controlada
```

Las alertas se ven en Prometheus, no se envían por correo en esta etapa. El detalle está en [monitoreo.md](monitoreo.md).

### Alcance de la demostración

El circuito local permite mostrar aplicación, base, réplica y monitoreo. HTTPS público requiere el despliegue/túnel de A9; `localhost:4200` solo demuestra ejecución local. Google, correo real, Telegram, Discord y push requieren sus credenciales específicas y no quedan habilitados por este setup. **A11/Mantis todavía no está integrado en `develop`**: no se levanta con estos comandos ni debe presentarse como terminado.

**Comprobación de esta guía (13/11/2026):** setup ensayado en un proyecto Docker separado, con una base nueva y puertos de base/pgAdmin alternativos. Pasaron migraciones, carga y validación del piloto; API saludable; login real desde Angular con ambos roles; creación, inscripción, QR generado, asistencia manual, dashboard y rechazo del asistente; backup y restauración. Base: backend `b7e2ba7`, frontend `2c0de57`; Node del host 24.15.0 y API en Node 22.22.3. Los apartados opcionales de réplica y monitoreo describen lo integrado, pero no se repitieron en este ensayo.

## 9. Detener el proyecto

En la **Terminal 2 del frontend**: pulsar **Ctrl+C**. Después, en la **Terminal 1, dentro del backend**, detener API, base y pgAdmin conservando datos:

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml stop
```

Si activaron réplica o monitoreo, detenerlos también:

```powershell
docker compose --env-file infra/hia/.env -f infra/hia/docker-compose.yml --profile replica --profile monitoreo stop db-replica prometheus grafana node-exporter cadvisor postgres-exporter blackbox
```

El recolector de métricas es un proceso Node local; para detenerlo seguir el apartado final de [monitoreo.md](monitoreo.md). No usar `down -v`: borra los datos persistentes.

Para volver a usarlo, seguir el **recorrido A**. Réplica y monitoreo se vuelven a iniciar con sus bloques respectivos del apartado 8.

## Si algo no funciona

| Síntoma | Qué revisar |
|---|---|
| Docker no responde | Abrir Docker Desktop y esperar a que el motor esté listo. |
| Puerto ocupado | Si es una instalación anterior de Convoca, usarla o detenerla antes. No levantar dos copias en los mismos puertos. Esta guía usa 3000, 4200, 5050 y 5435. |
| API no saludable | `docker compose --env-file infra/hia/.env -f infra/compose.yaml logs --tail 50 api`; comprobar migraciones y configuración local. No compartir logs que contengan secretos. |
| Login falla | Confirmar carga del piloto y usar las cuentas `lab.1` / `lab.2`; verificar primero `/api/health`. |
| No permite inscribirse | Usar un evento `PUBLICADO` con fecha futura, no uno sintético ya pasado. |
| Grafana rechaza la clave | Su volumen conserva la contraseña inicial; editar `.env` no cambia una cuenta ya creada. |
