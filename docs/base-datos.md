# Laboratorio PostgreSQL — actividad 4

Este manual se ejecuta desde la raíz de **proybackendgrupo02**, con Docker Desktop abierto y Node.js 22 (la misma versión mayor de CI). No se necesita instalar PostgreSQL ni pgBadger en Windows. Los comandos `lab:*` usan exclusivamente el PostgreSQL local de este Compose; no toman la conexión de Neon del `.env` de la API.

**Qué debe hacer cada integrante:** preparar su entorno y completar el piloto del apartado 2. No necesita una base previamente creada ni acceso a Neon: Docker levanta el servidor, `lab:migrate` crea la base y sus tablas y `lab:seed` carga los datos sintéticos. Clonar el repositorio o ejecutar `lab:up` **no carga esos datos**. Cada equipo conserva su propia base; los datos no se sincronizan con Git.

**Quién necesita la carga completa:** quien vaya a medir u optimizar los seis millones de inscripciones debe continuar con el apartado 3, usando el mismo perfil para comparar ANTES/DESPUÉS. No hace falta que todos repitan esa carga para comprobar que su instalación funciona.

## 1. Preparar e iniciar

Instalar **Docker Desktop** (motor Linux) y **Node.js 22**, y abrir Docker Desktop. DBeaver es opcional: el laboratorio ya incluye pgAdmin como interfaz.

Una vez integrado este cambio en `develop`, quien todavía no tenga el backend puede obtenerlo desde PowerShell:

```powershell
git clone https://github.com/MauroNanda/proybackendgrupo02.git
cd proybackendgrupo02
git switch develop
git pull --ff-only origin develop
```

Si ya está clonado, abrir PowerShell en esa carpeta, guardar los cambios propios pendientes y actualizar `develop` con los dos últimos comandos. Las tareas de código se realizan luego en una rama propia desde `develop`, según las pautas del equipo. Mientras este cambio no esté integrado, el `develop` remoto todavía no contiene estos comandos.

Desde esa carpeta, preparar las dependencias y la configuración local:

```powershell
npm ci
if (-not (Test-Path infra/hia/.env)) { Copy-Item infra/hia/.env.example infra/hia/.env }
```

Editar **infra/hia/.env**: reemplazar las dos claves `cambiar-...` por claves locales propias. Conservar los nombres de variables y `COMPOSE_PROJECT_NAME=convoca-lab-v2`. No subir este archivo a Git. El email de pgAdmin puede ser `lab@example.com`: identifica el login local, no envía correos.

```powershell
npm run lab:up
npm run lab:check
```

Resultado: `db-principal` y `pgadmin` disponibles. No se inicia la carga, la réplica ni el backup programado. Si 5435 o 5050 están ocupados, cambiar los puertos `LAB_DB_PORT` / `LAB_PGADMIN_PORT` en ese archivo y repetir `lab:up`.

**Datos anteriores:** esta versión usa PostgreSQL oficial 17 y volúmenes nuevos `convoca-lab-v2_*_v2`. No convierte ni reutiliza los volúmenes Bitnami anteriores. No ejecutar `down -v`, `prune`, `TRUNCATE` ni borrar bases para seguir este manual. Una base con datos ajenos o un perfil incompatible produce un error y conserva los datos.

## 2. Reproducir primero el piloto

```powershell
npm run lab:migrate -- --perfil piloto
npm run lab:seed -- --perfil piloto
npm run lab:validate -- --perfil piloto
npm run lab:backup -- --perfil piloto
npm run lab:restore-test -- --perfil piloto
```

Resultado: base **convoca_lab_piloto_v2**, exactamente **1.000 usuarios, 100 eventos y 10.000 inscripciones**. La validación comprueba cantidades, referencias, pares usuario/evento únicos, fechas, estados, cupos, claves foráneas e índices de partida.

Con esos comandos termina el setup de datos del piloto. Para ver las tablas y probar consultas, conectarse por DBeaver o pgAdmin siguiendo el apartado 5. No hay que importar archivos SQL a mano ni ejecutar el seed anterior por separado.

Se puede repetir `lab:seed`: los totales no crecen. Si se interrumpe, repetir el mismo comando reanuda desde el último lote confirmado. No cambiar la versión, fecha u objetivos en `dataset.json` para continuar una carga existente. El lote y su avance se confirman en la misma transacción. El bloqueo evita dos generadores cooperativos simultáneos; no bloquea escrituras de la API.

`restore-test` selecciona la copia más reciente del perfil, verifica SHA-256, restaura en una base temporal nueva, valida integridad y compara conteos, restricciones y muestras con el origen. Al terminar retira **solo esa base temporal**. Para que la comparación sea válida, no modificar el laboratorio mientras se respalda/restaura.

## 3. Carga completa

Después de validar el piloto y comprobar el espacio:

```powershell
npm run lab:check -- --perfil completo
npm run lab:migrate -- --perfil completo
npm run lab:seed -- --perfil completo
npm run lab:validate -- --perfil completo
npm run lab:analyze -- --perfil completo
npm run lab:backup -- --perfil completo
npm run lab:restore-test -- --perfil completo
```

Base **convoca_lab_v2**: **100.000 usuarios + 10.000 eventos + 6.000.000 inscripciones = 6.110.000 filas**. Los objetivos incluyen las cuentas de demostración. El piloto permanece separado. La carga completa exige al menos 15 GiB libres tanto en el host como en el almacenamiento Docker; es una reserva conservadora para carga, logs y restauración, no una predicción del tamaño final.

**Alcance académico pendiente de confirmar:** el enunciado pide seis millones por tabla del conjunto de prueba. Aquí se propone `Inscripciones` como tabla masiva y `Usuarios`/`Eventos` como apoyo. La cátedra debe aceptar esta interpretación; una carga técnicamente correcta no acredita por sí sola ese requisito.

## 4. Qué datos se generan y qué se conserva para actividad 5

Versión y objetivos: `infra/hia/dataset.json`. Generador: `seeders/seed-masivo.sql`, reemplaza el anterior en la misma ruta. Identificadores, correos y fechas son deterministas; los datos son sintéticos.

- El 10% de los eventos recibe la mitad de las inscripciones; el 90% restante recibe la otra mitad. En completo: 3.000 por evento popular y 333/334 por evento restante.
- Hay fechas anteriores y posteriores a la referencia fija **01/01/2026**, eventos publicados/cancelados e inscripciones `ASISTIO`, `CONFIRMADO`, `ESPERA` y `CANCELADO`.
- Los cupos cubren aproximadamente el 60% de las solicitudes por evento. Los turnos que exceden ese umbral quedan en espera; los eventos cancelados tienen inscripciones canceladas. Nadie supera el cupo con inscripciones activas.
- Cuenta organizadora: **lab.1@convoca.test**. Asistente: **lab.2@convoca.test**. Clave pública de demostración para ambas: **DemoConvoca2026!**. Solo sirven en esta base local. Los demás usuarios son soporte sintético sin login por contraseña.
- No se retiran índices ni claves foráneas. Actividad 5 debe comparar ANTES/DESPUÉS sobre el mismo perfil, datos y protocolo; registrar cambios de hardware o configuración. `lab:analyze` actualiza estadísticas y analiza logs, no implementa optimizaciones de la actividad 5.

## 5. Conectarse y detener

**DBeaver:** PostgreSQL, host `localhost`, puerto `5435` (o el elegido), base `convoca_lab_piloto_v2` / `convoca_lab_v2`, usuario y clave `POSTGRES_USER` / `POSTGRES_PASSWORD` de `infra/hia/.env`, SSL desactivado **solo para esta conexión local**.

**pgAdmin:** abrir http://localhost:5050 e ingresar con `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`. Registrar servidor: nombre `Convoca local`, host **db-principal**, puerto **5432**, base de mantenimiento `postgres`, usuario/clave del mismo archivo. Entre contenedores no se usa `localhost:5435`.

**API:** copiar la conexión local al `.env` raíz, usar `DB_SSL=false` y la base elegida. Para Neon usar `DB_SSL=true`; si no se declara, un destino remoto exige TLS. La API y las migraciones comparten la política y mantienen validación de certificados. No ejecutar este seed masivo en Neon.

Detener conservando datos:

```powershell
docker compose --env-file infra/hia/.env -f infra/hia/docker-compose.yml stop
```

Volver a iniciar: `npm run lab:up`. Las credenciales de PostgreSQL se establecen al crear el volumen: editar la contraseña en `.env` luego no cambia la del servidor existente. No borrar el volumen para resolverlo; coordinar el cambio de contraseña.

## 6. Backups, análisis y evidencias

- Backups comprimidos `.dump`, manifiestos `.json` y checksums `.sha256`: **infra/hia/backups/**, fuera de Git. Manual/programado usan `backup.sh`; conserva las dos copias más recientes de cada base y la última con restauración verificada (pueden ser tres). Ante un fallo no elimina las anteriores. No es almacenamiento externo: copiar una versión verificada fuera del equipo antes de una intervención riesgosa.
- Activar el backup cada doce horas **después** de completar la base: `docker compose --env-file infra/hia/.env -f infra/hia/docker-compose.yml --profile backups up -d backups`. Detenerlo con el mismo prefijo y `stop backups`. No activarlo durante la carga inicial. Si un proceso muere dejando `.lock`, verificar que no siga un `pg_dump` antes de retirar únicamente ese directorio de bloqueo.
- Logs de PostgreSQL: volumen `logs_v2`, rotación diaria de siete nombres; registra consultas de más de un segundo. `lab:analyze` incorpora unas consultas de comprobación identificables y crea **pgbadger.html**. El reporte refleja los logs disponibles y esas pruebas; no equivale a una prueba de carga de usuarios reales.
- Cada comando guarda **infra/hia/resultados/FECHA-operacion-perfil/**: log, versión de dataset, commit base, cambios locales, duración y resultado. `validate` agrega conteos, distribución, tamaños y muestras. Los resultados y backups están excluidos de Git.
- Para la entrega guardar los resultados de conteos/tamaños, integridad, persistencia, pgBadger y restauración. Las capturas deben ser reales y mostrar el resultado del comando o la interfaz; estos JSON/logs son evidencia de ejecución, no capturas.

Pruebas de configuración: `npm run test:lab`. La prueba adicional `node test/lab/integration.js` requiere el **piloto vacío y recién migrado**: comprueba interrupción, reanudación, concurrencia y rechazo de datos ajenos. Si el piloto ya está cargado, se niega a ejecutarse y no lo vacía. Para usarla nuevamente preparar otro proyecto local aislado, sin reemplazar los datos de trabajo.

## 7. Pendientes de cierre

La reproducción por otro integrante y la aceptación académica del alcance se registran por separado. No se consideran resueltas por una prueba automatizada. El resultado de esta rama y las mediciones verificadas se resumen en `docs/validacion-laboratorio.md`.
