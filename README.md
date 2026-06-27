# Convoca — Sistema de Gestión de Eventos Universitarios

Trabajo Final Integrador de la materia **Programación y Servicios Web** — Facultad de Ingeniería, Universidad Nacional de Jujuy.

**Grupo G02 — 5 integrantes.**

---

## Descripción del Proyecto

**Convoca** es un sistema web completo para la gestión de eventos universitarios (charlas, talleres, hackathons, actividades culturales y deportivas). El sistema cuenta con:

*   **Dos vistas diferenciadas por rol:**
    *   **Asistente:** explora el catálogo de eventos, se inscribe, recibe notificaciones y valora.
    *   **Organizador:** crea y gestiona eventos, ve estadísticas, exporta datos, escanea QRs para check-in.
*   **Sistema de notificaciones multicanal:** Telegram, Discord, Email y Notificaciones Push.
*   **Autenticación robusta:** JWT, hash de contraseñas con bcrypt, Login Social con Google, Autenticación de Dos Factores (2FA).
*   **Seguridad:** prevención de XSS y CSRF, auditoría de acciones e historial de accesos.
*   **Dashboard administrativo** con gráficos (Chart.js), DataTables y exportación a PDF y Excel.

---

## Tecnologías Aplicadas

### Frontend
*   **Angular 22** con Standalone Components y Signals
*   **Bootstrap 5** (responsive, mobile-first)
*   **ReactiveFormsModule** con validaciones personalizadas
*   **Chart.js / ng2-charts** para gráficos del Dashboard
*   **DataTables**, **jsPDF**, **exceljs** para listados y exportación

### Backend
*   **Node.js + Express** (arquitectura MVC con capa de Servicios)
*   **Sequelize** (ORM) sobre **PostgreSQL** (alojado en Neon.tech)
*   **JWT** para sesiones, **bcrypt** para hash de contraseñas
*   **express-validator**, **helmet** y middlewares de sanitización para seguridad

### Servicios Web Externos Integrados (6 — la consigna pide mínimo 4)
1.  **Google OAuth 2.0** — Login Social.
2.  **Telegram Bot API** — Notificaciones y 2FA.
3.  **Discord Bot** — Difusión automática de eventos nuevos.
4.  **Resend** — Emails transaccionales con plantillas HTML.
5.  **Google Calendar** — Link dinámico para agendar eventos.
6.  **Web Push API** — Notificaciones nativas del navegador.

---

## Estructura del Proyecto (Dos Repositorios)

Conforme a la consigna, el proyecto está dividido en dos repositorios independientes:

| Repositorio | URL | Contenido |
|---|---|---|
| **Backend** (este repo) | https://github.com/MauroNanda/proybackendgrupo02 | API REST en Node + Express, modelos Sequelize, integraciones con servicios externos y **documentación completa del proyecto**. |
| **Frontend** | https://github.com/MauroNanda/proyfrontendgrupo02 | Aplicación Angular 22 con las dos vistas y consumo de la API. |

---

## Documentación

Toda la documentación técnica del proyecto vive en la carpeta [`docs/`](./docs) de este repositorio. Es la **fuente única de verdad**.

| Archivo | Contenido |
|---|---|
| [`docs/CONSIGNA-TP-FINAL.md`](./docs/CONSIGNA-TP-FINAL.md) | Consigna oficial de la cátedra. |
| [`docs/PROPUESTA.md`](./docs/PROPUESTA.md) | Visión, alcance, features, flujos de usuario e integraciones. |
| [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) | Diagrama Entidad-Relación, esquema de BD (9 tablas) y estructura MVC. |
| [`docs/CONVENCIONES.md`](./docs/CONVENCIONES.md) | Reglas de código, estilo y nomenclatura. |
| [`docs/FLUJO_DE_TRABAJO.md`](./docs/FLUJO_DE_TRABAJO.md) | Estrategia de ramas, commits y Pull Requests. |
| [`docs/PLAN-DE-TAREAS.md`](./docs/PLAN-DE-TAREAS.md) | Tareas organizadas por fases y dominios, con asignación clara. |
| [`docs/SETUP.md`](./docs/SETUP.md) | Guía paso a paso para levantar el proyecto. |
| [`docs/BITACORA.md`](./docs/BITACORA.md) | Estado actual del proyecto y changelog. |

---

## Instalación Rápida

Ver guía completa en [`docs/SETUP.md`](./docs/SETUP.md).

```bash
# 1. Clonar ambos repositorios
git clone https://github.com/MauroNanda/proybackendgrupo02.git
git clone https://github.com/MauroNanda/proyfrontendgrupo02.git

# 2. Backend
cd proybackendgrupo02
npm install
cp .env.example .env       # completar variables
npx sequelize-cli db:migrate
npm run dev

# 3. Frontend (en otra terminal)
cd ../proyfrontendgrupo02
npm install
npm start
```

Backend: `http://localhost:3000` — Frontend: `http://localhost:4200`.

---

## Cumplimiento de la Consigna

| Requisito de la Consigna | Cobertura en el Proyecto |
|---|---|
| Múltiples roles de usuario | Organizador / Asistente |
| Operaciones CRUD | Eventos, Usuarios, Inscripciones, Valoraciones, Categorías |
| Métodos HTTP GET, POST, PUT, DELETE | Implementados en toda la API REST |
| Arquitectura MVC en backend | `controllers/`, `models/`, `routes/`, `services/` |
| Componentes Angular | Standalone Components con Signals |
| Bootstrap 5 + mobile-first | Sistema de estilos principal |
| Formularios reactivos con validaciones personalizadas | `ReactiveFormsModule` con custom validators |
| Al menos 4 servicios web externos | **6 integraciones** (Google OAuth, Telegram, Discord, Resend, Google Calendar, Web Push) |
| JWT + bcrypt + control de roles | Implementado |
| Prevención XSS, CSRF | Middlewares `helmet`, `sanitize`, validación de inputs |
| Login social OAuth | Google OAuth 2.0 |
| Auditoría de acciones | Tabla `AuditoriaAccion` |
| Historial de accesos | Tabla `HistorialAcceso` |
| Sequelize + Postgres | Sequelize sobre Neon.tech |
| Dashboard con gráficos | Chart.js / ng2-charts |
| DataTables con filtros, búsqueda, paginación | Lista de inscriptos |
| Exportación PDF y Excel | Reportes de inscriptos |
| Dos repositorios Git independientes | Backend y Frontend separados |

---

## Equipo

Grupo G02 — 5 integrantes. Materia **Programación y Servicios Web**, Facultad de Ingeniería, Universidad Nacional de Jujuy.

> Para más información sobre cómo trabajamos como equipo, ver [`docs/FLUJO_DE_TRABAJO.md`](./docs/FLUJO_DE_TRABAJO.md).
