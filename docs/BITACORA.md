# Bitácora del Proyecto y Estado Actual

## Estado Global: `Fase 0 — Proyecto Base (en marcha)`

### Resumen del Estado Actual
Propuesta completa definida y adaptada a la consigna oficial. Repositorios separados creados en GitHub (grupo G02). El repo del backend (`proybackendgrupo02`) es la **fuente única de verdad de la documentación** (propuesta, arquitectura, consigna, bitácora, convenciones globales, flujo de trabajo). El repo del frontend (`proyfrontendgrupo02`) tiene su propio `README.md`, `CLAUDE.md` y dos docs específicas (`SETUP-FRONTEND.md`, `CONVENCIONES-FRONTEND.md`) que enlazan al backend para evitar duplicación. Falta inicializar el código fuente en ambos repos y crear el Proyecto Base en `develop`.

### Repositorios
*   **Backend:** https://github.com/MauroNanda/proybackendgrupo02
*   **Frontend:** https://github.com/MauroNanda/proyfrontendgrupo02

### Hitos y Tareas Pendientes (To-Do)
- [x] Definición de la idea base (Convoca con notificaciones).
- [x] Crear y organizar estructura documental (`CLAUDE.md`, `docs/`).
- [x] Crear `docs/PROPUESTA.md` con alcance, features, integraciones y flujos.
- [x] Crear `docs/ARQUITECTURA.md` con esquema de BD (9 tablas) y estructura MVC.
- [x] Definir arquitectura de doble vista (Asistente vs Organizador).
- [x] Crear base de datos en Neon.tech y configurar archivos `.env`.
- [x] Analizar consigna oficial y adaptar toda la documentación.
- [x] Separar en 2 repositorios (`proybackendgrupo02` y `proyfrontendgrupo02`).
- [x] Reestructurar archivos del backend a la raíz del repo.
- [x] Definir estrategia de documentación entre los 2 repos (backend = SSOT, frontend slim).
- [x] Expandir `FLUJO_DE_TRABAJO.md` con convención de commits, reglas de PR y commits atómicos.
- [x] Crear `docs/PLAN-DE-TAREAS.md` con fases (0→3) y dominios verticales por integrante.
- [x] Crear `README.md` raíz del backend como portada legible para la cátedra.
- [x] **Fase 0:** Inicializado Proyecto Base Backend (Express, Sequelize, MVC, `GET /api/health` probado contra Neon).
- [x] **Fase 0:** Inicializado Proyecto Base Frontend (Angular 22, Bootstrap 5, layouts public/admin, lazy loading, home con smoke test al backend, build prod verificado).
- [x] Rename UniEvents → Convoca en toda la documentación.
- [ ] PR del Proyecto Base a `main` en ambos repos. **Habilita el inicio de Fase 1 al mergearse.**
- [ ] Esperar resultado de Claude Design → crear `docs/DISEÑO.md`, `src/styles/_variables.scss` y aplicar paleta + tipografía + logo en layouts.
- [ ] Crear Bot de Telegram y Bot de Discord (Fase 3).
- [ ] Configurar Google OAuth en Google Cloud Console (Fase 3).
- [ ] Configurar cuenta de Resend (necesario para Fase 1, dominio Notificaciones).
- [ ] Redactar documento de funcionalidades y modelo de datos para aprobación del docente.

### Log de Cambios (Changelog)
*   **2026-06-27 (Sesión 7):** Proyecto rebrandeado de "UniEvents" a **Convoca** en toda la documentación. **Construido el Proyecto Base** completo:
    *   **Backend:** Express + Sequelize + Postgres (Neon) con estructura MVC + capa de servicios. Endpoint `GET /api/health` operativo (probado, devuelve `{status: ok, database: up}`). Migración inicial corrida exitosamente en Neon (tabla `Usuarios`). Middlewares CORS, Helmet, sanitización y error handler. Configuración `.sequelizerc`, ESLint flat config, `.env.example` ampliado con todas las variables previstas para Fases 1-3.
    *   **Frontend:** Angular 22 con standalone components, Bootstrap 5 instalado, lazy loading configurado, layouts `public-layout` y `admin-layout` (esqueleto sin estilos custom), `core/{services,guards,interceptors}` con esqueletos JWT/auth/role, `environments/{environment,environment.prod}.ts`, página demo en `features/public/home` que consume `/api/health` y muestra el estado del backend en vivo. Build de producción verificado.
    *   Integración end-to-end probada: ambos servidores arrancan, backend habla con Neon, frontend compila y sirve. **Falta sólo aplicar paleta visual cuando llegue el diseño.**
*   **2026-06-27 (Sesión 6):** Diseño del flujo de trabajo del equipo. Expandido `FLUJO_DE_TRABAJO.md` con convenciones de ramas (`feature/*`, `fix/*`, `docs/*`, `chore/*`), Conventional Commits en español, reglas de PR (nunca merge directo, push y avisar, cambios sobre misma rama) y regla de **commits atómicos**. Creado `docs/PLAN-DE-TAREAS.md` con fases híbridas A+B (Fase 0 Proyecto Base → Fase 1 Asistente MVP → Fase 2 Organizador → Fase 3 Integraciones) y 5 dominios verticales (Auth, Eventos, Inscripciones, Notificaciones, Dashboard) repartibles entre los 5 integrantes. Creado `README.md` en raíz del backend como portada legible para la cátedra. Índices de CLAUDE.md (backend y frontend) y README del frontend actualizados.
*   **2026-06-26 (Sesión 5):** Definida estrategia de documentación entre 2 repos. Backend = fuente única de verdad. Creados en el repo frontend: `README.md`, `CLAUDE.md`, `docs/SETUP-FRONTEND.md` y `docs/CONVENCIONES-FRONTEND.md` (todos enlazan al backend, sin duplicar). Bitácora se mantiene única acá.
*   **2026-06-26 (Sesión 4):** Separación en 2 repos según consigna. Repo `tp-final-pysweb` renombrado a `proybackendgrupo02`. Creado repo `proyfrontendgrupo02` (vacío). Archivos de `/backend` movidos a raíz del repo. Todas las URLs actualizadas en docs.
*   **2026-06-26 (Sesión 3):** Recepción de consigna oficial. Adaptación: MVC en backend, Bootstrap 5, 2 repos, OAuth + 2FA + auditoría + historial + XSS/CSRF, Dashboard con Chart.js + DataTables + export PDF/Excel, formularios reactivos. BD ampliada a 9 tablas.
*   **2026-06-26 (Sesión 2):** Ampliación de la propuesta. Doble vista. Integraciones: Discord Bot, Email HTML, Web Push. Features: Valoraciones, Recomendaciones, Countdown, Eventos Recurrentes.
*   **2026-06-26 (Sesión 1):** Creación inicial de estructura documental. Stack definido. BD en Neon.tech (Postgres 18, São Paulo).
