# Bitácora del Proyecto y Estado Actual

## Estado Global: `Fase 2 completada — preparando Fase 3 (Integraciones)`

### Resumen del Estado Actual
Propuesta completa definida y adaptada a la consigna oficial. Repositorios separados creados en GitHub (grupo G02). El repo del backend (`proybackendgrupo02`) es la **fuente única de verdad de la documentación** (propuesta, arquitectura, consigna, bitácora, convenciones globales, flujo de trabajo). El repo del frontend (`proyfrontendgrupo02`) tiene su propio `README.md`, `CLAUDE.md` y dos docs específicas (`SETUP-FRONTEND.md`, `CONVENCIONES-FRONTEND.md`) que enlazan al backend para evitar duplicación. El Proyecto Base y las Fases 1 y 2 (Asistente MVP y Organizador MVP) ya están implementados y mergeados a `main`; el proyecto se encuentra preparando la Fase 3 (Integraciones Avanzadas).

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
- [x] PR del Proyecto Base a `main` en ambos repos. **Habilita el inicio de Fase 1 al mergearse.**
- [x] Esperar resultado de Claude Design → crear `docs/DISEÑO.md`, `src/styles/_variables.scss` y aplicar paleta + tipografía + logo en layouts.
- [x] Remover archivos binarios pesados (mockups) del repositorio Git y referenciarlos en un README.md hacia Drive para evitar bloat.
- [x] **Fase 2:** Dashboard administrativo con KPIs y gráficos (T-10) mergeado a `main` en ambos repos.
- [x] **Mejoras sutiles:** ronda de robustez (backend) y UX/rendimiento (frontend) en la rama `feature/mejoras-sutiles`.
- [x] **Fase 3 — Terreno:** hub de notificaciones y hooks de eventos para desacoplar integraciones (rama `feature/fase3-preparacion`).
- [x] **Fase 3 — Planificación:** tareas T-11 a T-15 detalladas en `PLAN-DE-TAREAS.md`.
- [ ] Crear Bot de Telegram y Bot de Discord (Fase 3).
- [ ] Configurar Google OAuth en Google Cloud Console (Fase 3).
- [ ] Configurar cuenta de Resend (necesario para Fase 1, dominio Notificaciones).
- [ ] Redactar documento de funcionalidades y modelo de datos para aprobación del docente.

### Log de Cambios (Changelog)
*   **2026-07-05 (Sesión 10):** Preparación de Fase 3.
    *   **Terreno (rama `feature/fase3-preparacion`):** hub de notificaciones (`integrations/notificaciones.js` + `channels/`) y hooks de eventos (`integrations/eventos.hooks.js`), para que las integraciones se sumen creando un archivo y registrándolo, sin tocar `inscripcion.service`/`evento.service`. Guía en `integrations/README.md`.
    *   **Planificación:** definidas las tareas T-11 a T-15 en `PLAN-DE-TAREAS.md` (Google OAuth + 2FA opt-in, Telegram, Web Push, Discord, Google Calendar) con circuito, archivos, dependencias y dificultad por tarea.
    *   **Integración a `main`:** mergeadas las ramas `feature/mejoras-sutiles` y `feature/fase3-preparacion` a `main` en ambos repos. Limpieza de ramas: eliminadas todas las ramas viejas (local y remoto), queda únicamente `main`. **Recordatorio post-merge:** correr `npm install` en el backend (dependencia nueva `express-rate-limit`).
*   **2026-07-04 (Sesión 9):** Cierre de Fase 2 y ronda de mejoras.
    *   **Dashboard (T-10):** Panel administrativo con KPIs y gráficos (Chart.js) finalizado y mergeado a `main` en backend y frontend.
    *   **Mejoras sutiles (rama `feature/mejoras-sutiles`):** endurecimiento del backend (transacciones con bloqueo en inscripciones/cancelaciones para evitar sobreventa de cupos, rate limiting en autenticación, validaciones y `.trim()` en rutas, paginación acotada, unificación de errores, índices en `Inscripciones`) y del frontend (corrección de fugas de memoria en countdown y catálogo, spinner de carga y `trackBy` en el catálogo, timeout en el health-check, accesibilidad ARIA, limpieza de código muerto). `JWT_SECRET` pasa a ser obligatorio solo en producción (fallback en desarrollo, con `.env.example` de referencia).
*   **2026-06-27 (Sesión 8):** Integración de diseño y limpieza de binarios.
    *   **Diseño:** Seleccionada la paleta "Arctic Reflection" (azules elegantes con accent ámbar). Creados los tokens de diseño y variables SCSS en el frontend, importadas las Google Fonts (Space Grotesk + Inter) y aplicados los estilos a los layouts público y administrativo. Creado `docs/DISEÑO.md` con las especificaciones del Design System.
    *   **Limpieza:** Eliminados los archivos binarios pesados de los mockups (PNGs y PDF) del repositorio Git para evitar sobrecarga de historial. Agregado `mockup/README.md` con la referencia al Google Drive compartido.
    *   **Estado:** Todo compilado, build de producción limpio (0 warnings) y cambios subidos a la rama remota `chore/proyecto-base` en ambos repositorios.
*   **2026-06-27 (Sesión 7):** Proyecto rebrandeado de "UniEvents" a **Convoca** en toda la documentación. **Construido el Proyecto Base** completo:
    *   **Backend:** Express + Sequelize + Postgres (Neon) con estructura MVC + capa de servicios. Endpoint `GET /api/health` operativo. Migración inicial de tabla `Usuarios` corrida exitosamente. Middlewares CORS, Helmet, sanitización y error handler. Configuración `.sequelizerc`, ESLint, `.env.example` completo.
    *   **Frontend:** Angular 22 con standalone components, Bootstrap 5, layouts `public-layout` y `admin-layout` (esqueletos), `environments/` configurados, página demo `home` que consume backend. Build y pruebas unitarias corregidas y verificadas.
    *   **Contratos compartidos (Bloque 1):** Backend con `HttpError`, `jwt.util.js`, `validate.middleware.js` y CRUD `Usuario` completo como plantilla. Frontend con interfaces base, `ToastService`, `AuthService` (con Signals), `jwtInterceptor` y `errorInterceptor` global.
    *   **Calidad y CI (Bloque 2):** Instalado `husky` + `lint-staged` en ambos repos (`eslint` en back, `prettier` en front). Creados flujos GitHub Actions (`ci.yml`) para build/lint/test. Activada protección de rama `main` en GitHub UI.
    *   **Estado:** Ramas `chore/proyecto-base` con commits atómicos pusheadas, PRs abiertas y listas en GitHub esperando aprobación y diseño final.
*   **2026-06-27 (Sesión 6):** Diseño del flujo de trabajo del equipo. Expandido `FLUJO_DE_TRABAJO.md` con convenciones de ramas (`feature/*`, `fix/*`, `docs/*`, `chore/*`), Conventional Commits en español, reglas de PR (nunca merge directo, push y avisar, cambios sobre misma rama) y regla de **commits atómicos**. Creado `docs/PLAN-DE-TAREAS.md` con fases híbridas A+B (Fase 0 Proyecto Base → Fase 1 Asistente MVP → Fase 2 Organizador → Fase 3 Integraciones) y 5 dominios verticales (Auth, Eventos, Inscripciones, Notificaciones, Dashboard) repartibles entre los 5 integrantes. Creado `README.md` en raíz del backend como portada legible para la cátedra. Índices de CLAUDE.md (backend y frontend) y README del frontend actualizados.
*   **2026-06-26 (Sesión 5):** Definida estrategia de documentación entre 2 repos. Backend = fuente única de verdad. Creados en el repo frontend: `README.md`, `CLAUDE.md`, `docs/SETUP-FRONTEND.md` y `docs/CONVENCIONES-FRONTEND.md` (todos enlazan al backend, sin duplicar). Bitácora se mantiene única acá.
*   **2026-06-26 (Sesión 4):** Separación en 2 repos según consigna. Repo `tp-final-pysweb` renombrado a `proybackendgrupo02`. Creado repo `proyfrontendgrupo02` (vacío). Archivos de `/backend` movidos a raíz del repo. Todas las URLs actualizadas en docs.
*   **2026-06-26 (Sesión 3):** Recepción de consigna oficial. Adaptación: MVC en backend, Bootstrap 5, 2 repos, OAuth + 2FA + auditoría + historial + XSS/CSRF, Dashboard con Chart.js + DataTables + export PDF/Excel, formularios reactivos. BD ampliada a 9 tablas.
*   **2026-06-26 (Sesión 2):** Ampliación de la propuesta. Doble vista. Integraciones: Discord Bot, Email HTML, Web Push. Features: Valoraciones, Recomendaciones, Countdown, Eventos Recurrentes.
*   **2026-06-26 (Sesión 1):** Creación inicial de estructura documental. Stack definido. BD en Neon.tech (Postgres 18, São Paulo).
