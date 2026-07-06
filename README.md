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

## Documentación

Toda la documentación del proyecto vive en la carpeta [`docs/`](./docs) de este repositorio:

| Archivo | Contenido |
|---|---|
| [`docs/PROPUESTA.md`](./docs/PROPUESTA.md) | Alcance del proyecto, funcionalidades e integraciones. |
| [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) | Esquema de base de datos y estructura del código. |
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
