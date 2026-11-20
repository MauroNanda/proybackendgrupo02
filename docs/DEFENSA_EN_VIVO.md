# Defensa en vivo de Convoca

La consigna se demuestra con el tablero, una consulta de la base completa, una publicación que cambia después de CI y un incidente que recorre Prometheus, n8n y Mantis. Usar la base piloto para las operaciones controladas y conservar la carga completa para consultas.

## 1. Arranque

Abrir Docker Desktop y el workspace con ambos repositorios. En PowerShell, desde el backend, ejecutar el recorrido A de [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md) si ya están preparados la configuración y los datos; usar B en un equipo nuevo. Los archivos `.env` se conservan con sus volúmenes. Recuperar los de una instalación existente desde su ubicación privada y preparar credenciales nuevas solo para una instalación nueva.

Con el piloto ya cargado, validar sus datos y levantar la réplica desde el backend:

```powershell
npm run lab:validate -- --perfil piloto
npm run lab:replica-up
```

Iniciar las integraciones siguiendo [AUTOMATIZACIONES_A13.md](AUTOMATIZACIONES_A13.md), desde la preparación de A10, Mantis y Nextcloud. Si la API que se monitorea se creó con otro nombre, pasarlo mediante `-ApiContainer`. Mantener un único destino `api` en la red de monitoreo. Si el runner usa `N8N_LAB_ROOT`, esa ruta debe coincidir con el proyecto PostgreSQL y su directorio de backups.

## 2. Qué abrir

| Pestaña | Qué mostrar |
|---|---|
| [GitHub Projects](https://github.com/users/MauroNanda/projects/3) | Abrir una de las 15 actividades y seguir su enlace al PR. Mostrar responsable, estado, historial de commits y comprobaciones. |
| pgAdmin | Seleccionar `convoca_lab_v2`. Abrir Query Tool y ejecutar el conteo y la muestra de abajo. |
| Aplicación publicada | Mostrar el texto visible y `/version.json` antes y después del CI. Usar el recorrido de la sección 3. |
| Prometheus `/alerts` y n8n `Executions` | Ver el estado `firing`, la ejecución correspondiente y luego la recuperación. |
| Mantis y Mailpit | Mostrar el mismo ID de ticket y el aviso asociado. Mailpit recibe avisos en el entorno local. |
| Nextcloud | Mostrar la carpeta de entrega con una cuenta del equipo. |

## 3. Despliegue automático de un cambio visible

El publicador actualiza el frontend cuando CI aprueba el commit. El CI del backend construye también su imagen de producción. La API del piloto se inicia por separado.

1. Con el publicador en marcha, abrir el sitio y `/version.json`. Anotar el SHA activo.
2. Para el ensayo, cambiar el texto de marca del frontend en la rama `demo/a8-despliegue`, hacer commit y push. Abrir el CI de ese push en Actions y mostrar que el sitio conserva la versión anterior mientras se ejecuta.
3. Cuando CI termine correctamente, esperar a que el publicador detecte el commit y recargar. Mostrar el texto nuevo, el SHA en `/version.json` y el resultado de `/api/health`.

Desde la carpeta del frontend de esta máquina, con Docker Desktop, GitHub CLI autenticado y la API de publicación iniciada, este comando reanuda el publicador de ensayo para el túnel actual si se había detenido. Mantenerlo en ejecución mientras se realiza la demostración.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/desplegar-cd.ps1 -Demo -Port 8089 -Network convoca-a15-publicacion
```

El túnel temporal apunta a `127.0.0.1:8089`. Si cambia la URL, actualizar el origen permitido y la URL del frontend en la configuración privada de la API de publicación. Para una instalación nueva, seguir la sección de publicación HTTPS de [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md) y la guía de CD del frontend.

## 4. Base completa, backup y réplica

Los datos sintéticos se cargan con `seeders/seed-masivo.sql`. Mostrar `infra/hia/dataset.json` para explicar los perfiles y luego ejecutar lo siguiente en Query Tool sobre `convoca_lab_v2`:

```sql
SELECT current_database() AS base, count(*) AS inscripciones
FROM "Inscripciones";

SELECT id, "usuarioId", "eventoId", estado
FROM "Inscripciones"
LIMIT 20;
```

Se esperan 6.000.000 de inscripciones. Usuarios y Eventos aportan 100.000 y 10.000 registros. Identificar el alcance adoptado frente al texto de A4, que pide seis millones por tabla del conjunto de prueba.

Para el backup, abrir `infra/hia/backup.sh` y explicar `pg_dump -Fc`, el SHA-256 y la restauración en una base temporal. La demostración breve usa el piloto:

```powershell
npm run lab:backup -- --perfil piloto
npm run lab:restore-test -- --perfil piloto
```

La réplica es física y asíncrona. Mostrar `pg_stat_replication` en el principal y `pg_is_in_recovery()` en el standby. Para probar recuperación, detener únicamente el standby del piloto, comprobar que el principal sigue operativo, reiniciar el standby y verificar que alcanza el WAL pendiente. Las instrucciones están en [replicacion-postgresql.md](replicacion-postgresql.md). La caída del principal interrumpe el servicio de la API hasta su recuperación o una intervención manual coordinada.

Con el proyecto piloto `convoca-lab-v2-a15` y su réplica en ejecución, `node scripts/validar-defensa-replica.cjs` comprueba ese recorrido y elimina su tabla temporal al finalizar.

## 5. Qué hacer si una alerta tarda

Prometheus recolecta y evalúa cada 15 segundos. La regla de disponibilidad exige 30 segundos y n8n consulta cada 30 segundos. Seguir el estado del circuito mientras transcurren esos intervalos:

1. En Prometheus revisar `probe_success{job="api-health"}` y el estado `pending` o `firing`. Confirmar que el destino sea la API elegida para el ensayo.
2. En n8n abrir la última ejecución programada del Flujo 1. Comprobar que la consulta a Prometheus devolvió la alerta y que se obtuvo un ID de Mantis.
3. Abrir ese ticket y buscar su aviso en Mailpit. Ante un fallo SMTP, recuperar el aviso desde la ejecución sin repetir el backup o la restauración.
4. Restaurar la API del piloto, esperar a que `/api/health` devuelva 200 y comprobar que el ticket se resolvió. Para el segundo ciclo partir de un estado saludable y esperar la resolución del primero.

El sondeo habitual del Flujo 1 consulta Prometheus directamente. El webhook autenticado es una entrada adicional. Mostrar la ejecución en el lienzo de n8n sin abrir encabezados con credenciales.

En esta máquina, repetir los dos ciclos solo sobre la API aislada de monitoreo:

```powershell
node scripts/validar-defensa-alertas.js convoca-lab-v2-a14-api-1
```

El comando detiene y recupera esa API dos veces. Ejecutarlo fuera de la exposición si se quiere comprobar todos los eslabones y medir la demora. Para probar backup, aprobación de restauración e informe, usar `node scripts/n8n-validar.js --restaurar`, con el runner y Nextcloud activos.

## 6. Puertos de esta máquina

El piloto del workspace responde por la API en `3006` y por el frontend local en `8088`. El publicador de ensayo HTTPS usa `8089`. El cliente pgAdmin de la carga completa abre en `5050`. Dentro de ese contenedor se conecta por el servicio `db-principal:5432`. Desde Windows, un cliente SQL conecta a `127.0.0.1:5435` para la carga completa y a `127.0.0.1:5565` para el piloto A15.

Para reanudar esta instalación desde el backend, con Docker Desktop iniciado y los contenedores existentes:

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --wait api
docker start convoca-defensa-ui
Invoke-RestMethod http://localhost:8088/api/health
```

Se espera `status: ok` y `database: up`. En otro equipo se debe construir el frontend con su `Dockerfile.production` y conectarlo a la red de la API, como se indica en las guías de publicación y CD. El puerto `8088` de esta instalación se configuró como origen de la API local.

Prometheus `9090` vigila la API del piloto de monitoreo `3004`. Para los ensayos de caída usar esa API y su recuperación, manteniendo disponible la aplicación de práctica de `8088`. Grafana, Mantis, n8n, Mailpit y Nextcloud abren respectivamente en `3001`, `8989`, `5680`, `8028` y `8082`.

## 7. Evidencias de ejecución

- [pgAdmin con seis millones de inscripciones](evidencias/defensa-en-vivo/pgadmin-base-completa.png), [alcance de la réplica](evidencias/defensa-en-vivo/replica-a15.json) y [restauración del piloto](evidencias/defensa-en-vivo/restauracion-piloto-a15.json).
- [Recorrido de la aplicación local](evidencias/defensa-en-vivo/ensayo-local.json) y [recorrido de la aplicación por HTTPS](evidencias/defensa-en-vivo/ensayo-https.json).
- [Dos caídas y recuperaciones](evidencias/defensa-en-vivo/a13-alertas.json), [backup e informe de n8n](evidencias/defensa-en-vivo/a13-backup-e-informe.json), [fallo SMTP](evidencias/defensa-en-vivo/a14-fallo-smtp.json) y [reenvío confirmado](evidencias/defensa-en-vivo/a14-recuperar-smtp.json).
- [Cambio visible, prueba por HTTPS y rollback del frontend](https://github.com/MauroNanda/proyfrontendgrupo02/pull/30).
