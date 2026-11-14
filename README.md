# Convoca — Backend

API REST del sistema Convoca. Trabajo Final Integrador de **Programación y Servicios Web** — Facultad de Ingeniería, Universidad Nacional de Jujuy. Grupo G02.

## Qué es Convoca

Convoca es una plataforma web para la gestión de eventos universitarios (charlas, talleres, hackathons, actividades culturales y deportivas). Permite publicar eventos, administrar inscripciones con control de cupo, hacer check-in de asistentes mediante código QR y mantener informados a los participantes con notificaciones por varios canales.

## Stack

*   **Backend (este repositorio):** Node.js + Express, con Sequelize (ORM) sobre PostgreSQL alojado en Neon.
*   **Frontend:** Angular + Bootstrap — [proyfrontendgrupo02](https://github.com/MauroNanda/proyfrontendgrupo02).

## Funcionalidades principales

*   Autenticación con email y contraseña, login con Google y verificación en dos pasos (2FA).
*   Gestión de eventos por parte de organizadores y catálogo público para asistentes.
*   Inscripciones con control de cupo y lista de espera.
*   Notificaciones en la aplicación, por email y push del navegador.
*   Integraciones con Telegram, Discord y Google Calendar.
*   Dashboard administrativo con estadísticas y exportación de datos.

## Cómo levantarlo

**Para el equipo de HIA:** seguir [Levantar el proyecto y mostrar los avances](docs/GUIA_DEMOSTRACION.md). Centraliza el setup local de ambos repositorios, las cuentas del piloto y el recorrido de demostración de aplicación e infraestructura.

Requisitos: Node.js y una base de datos PostgreSQL (por ejemplo, en Neon).

```bash
# 1. Clonar el repositorio
git clone https://github.com/MauroNanda/proybackendgrupo02.git
cd proybackendgrupo02

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar las variables en .env (base de datos, JWT, servicios externos)

# 4. Ejecutar las migraciones
npx sequelize-cli db:migrate

# 5. Iniciar el servidor
npm start          # producción
npm run dev        # desarrollo (recarga automática con nodemon)
```

El servidor queda en `http://localhost:3000` (configurable con la variable `PORT`). Para verificar que responde: `GET http://localhost:3000/api/health`.

Guía de instalación detallada en [`docs/SETUP.md`](./docs/SETUP.md).

## Ejecutar la API en Docker (actividad 7 de HIA)

Requisitos de desarrollo: Docker Desktop con Compose y Node.js 22.22.3/npm 11.12.1 para los comandos `lab:*`. El `Dockerfile` ofrece los objetivos `development` y `production`; el Compose de desarrollo integra el laboratorio PostgreSQL de `infra/hia/docker-compose.yml` mediante `infra/compose.yaml`.

Desde la raíz del repositorio, preparar las dependencias locales del laboratorio y una configuración propia:

```powershell
npm ci
if (-not (Test-Path infra/hia/.env)) { Copy-Item infra/hia/.env.example infra/hia/.env }
```

En `infra/hia/.env`, reemplazar las contraseñas de muestra y `API_JWT_SECRET` por valores locales propios. No subir ese archivo. Luego preparar la base piloto e iniciar los servicios:

```powershell
npm run lab:up
npm run lab:migrate -- --perfil piloto
npm run lab:seed -- --perfil piloto
npm run lab:validate -- --perfil piloto
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --build
```

La API queda en `http://localhost:3000` y pgAdmin en `http://localhost:5050`. Dentro de Docker, la API se conecta a `db-principal:5432`; el navegador usa `localhost:3000`. La base del piloto es `convoca_lab_piloto_v2` y conserva sus datos en los volúmenes versionados del laboratorio. Verificar el estado con `docker compose --env-file infra/hia/.env -f infra/compose.yaml ps` y `Invoke-RestMethod http://localhost:3000/api/health`. Para detener los servicios sin borrar datos: `docker compose --env-file infra/hia/.env -f infra/compose.yaml stop`.

Para publicación, usar `infra/compose.production.yaml` con `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` y `FRONTEND_URL` provistos por el entorno de ejecución; opcionalmente definir `API_PORT` y `API_BIND_ADDRESS`. No incluir `.env` ni credenciales en la imagen. El Compose de publicación no inicia PostgreSQL local: requiere una base externa accesible desde el host de Docker.

```powershell
docker compose --env-file .env.production -f infra/compose.production.yaml up -d --build
```

La configuración y recuperación manual del PostgreSQL principal/réplica de la actividad 6 están en [`docs/replicacion-postgresql.md`](./docs/replicacion-postgresql.md).

## Documentación

**HIA A11:** [levantar Mantis y revisar los diez incidentes](docs/mantis-a11.md). Incluye Docker, acceso de cada integrante, tickets, historial y evidencias; funciona independientemente de la base PostgreSQL de Convoca.

Laboratorio local para HIA: seguir **[docs/base-datos.md](./docs/base-datos.md)**. Incluye Docker, piloto, carga masiva reanudable, pgAdmin, validación y backup/restauración; usa bases separadas de Neon.

Toda la documentación del proyecto vive en la carpeta [`docs/`](./docs) de este repositorio:

| Archivo | Contenido |
|---|---|
| [`docs/PROPUESTA.md`](./docs/PROPUESTA.md) | Alcance del proyecto, funcionalidades e integraciones. |
| [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) | Esquema de base de datos y estructura del código. |
| [`docs/FUNCIONALIDADES-Y-PRUEBAS.md`](./docs/FUNCIONALIDADES-Y-PRUEBAS.md) | Funcionalidades existentes y cómo probar cada una. |
| [`docs/circuitos/`](./docs/circuitos) | Guías de defensa por circuito: flujo, archivos y puntos clave, con responsables. |
| [`docs/PLAN-DE-TAREAS.md`](./docs/PLAN-DE-TAREAS.md) | Tareas organizadas por fases y dominios, con responsables. |
| [`docs/BITACORA.md`](./docs/BITACORA.md) | Estado actual y funcionalidades implementadas. |
| [`docs/CONVENCIONES.md`](./docs/CONVENCIONES.md) | Reglas de código, estilo y nomenclatura. |
| [`docs/FLUJO_DE_TRABAJO.md`](./docs/FLUJO_DE_TRABAJO.md) | Forma de trabajo del equipo con Git. |
| [`docs/CONSIGNA-TP-FINAL.md`](./docs/CONSIGNA-TP-FINAL.md) | Consigna oficial de la cátedra. |
| [`docs/SETUP.md`](./docs/SETUP.md) | Guía paso a paso para levantar el proyecto. |

## Repositorios

| Repositorio | URL |
|---|---|
| Backend (este) | https://github.com/MauroNanda/proybackendgrupo02 |
| Frontend | https://github.com/MauroNanda/proyfrontendgrupo02 |
