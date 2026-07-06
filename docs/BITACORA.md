# Bitácora del Proyecto y Estado Actual

## Estado Global: `Fase 3 COMPLETA — T-11 a T-15 hechos (falta cargar VAPID y probar push en vivo); reglas de negocio C-04/06/08/16 aplicadas`

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
- [x] **Fase 3 (T-14):** Bot de Discord — difusión de eventos publicados en `#eventos_convoca`, mergeado a `main`.
- [x] **Fase 3 (T-12, scope reducido):** Bot de Telegram — difusión grupal (anuncio + cancelación) en `@convoca_unju_2026`, mergeado a `main`. Sin vinculación de cuenta ni notificaciones personales.
- [ ] Configurar Google OAuth en Google Cloud Console (Fase 3).
- [ ] Configurar cuenta de Resend (necesario para Fase 1, dominio Notificaciones).
- [ ] Redactar documento de funcionalidades y modelo de datos para aprobación del docente.

### Log de Cambios (Changelog)
*   **2026-07-06 (Sesión 16):** Ampliación de notificaciones de eventos (rama `feature/notif-eventos`, análisis con modelo Fable).
    *   **🔴 Bug corregido:** `inscripcion.service.cancelar` llamaba `notificaciones.cupoLiberado(usuario)` **sin el evento** → el aviso no decía de qué evento se liberó el cupo. Ahora pasa el `evento` (in-app y push nombran el evento).
    *   **Nuevo `eventoCancelado`:** al cancelar un evento, se captura la lista de inscriptos activos **antes** del baja masiva (después quedan en CANCELADO, indistinguibles) y se les notifica personalmente por los 3 canales (antes solo había difusión grupal Telegram/Discord — el inscripto podía no enterarse). Cierra el hueco que el propio comentario del código prometía.
    *   **Nuevo `eventoModificado`:** si un evento PUBLICADO cambia fecha o ubicación, se avisa a los inscriptos (guard anti-ruido: solo PUBLICADO→PUBLICADO y solo campos operativos, no título/descripción).
    *   **Infra:** hub `emitir` extendido con arg `extra` (para `cambios`); `tipo` de `Notificacion` sumó `EVENTO_CANCELADO`/`EVENTO_MODIFICADO` al ENUM (migración `20260706130000`). Notificaciones aisladas con try/catch por usuario (un fallo no rompe la edición del evento). Validado en vivo: in-app persiste con los tipos nuevos, email interpola el título, push llega.
*   **2026-07-06 (Sesión 15):** T-13 (Web Push) integrado en ambos repos — **última tarea de Fase 3**.
    *   **Backend (`feature/web-push`):** modelo `PushSubscription` (endpoint único + `keys` JSONB) con migración, `integrations/push.service.js` (wrapper de `web-push`, config VAPID lazy), `integrations/channels/push.channel.js` registrado en el hub de notificaciones (`inscripcionConfirmada`/`inscripcionEnEspera`/`cupoLiberado`, borra suscripciones con 410), rutas `GET /api/push/vapid-public-key` (pública) y `POST /api/push/subscribe` (autenticada). Validado: server arranca sin VAPID (push deshabilitado con warning), `/vapid-public-key` → 503 sin config, `/subscribe` → 401 sin token.
    *   **Frontend (`feature/web-push`):** service worker (`sw.js`), `manifest.webmanifest` (PWA), `push.service.ts` (permiso + suscripción con `applicationServerKey`), botón "Alertas del navegador" en el layout público. Incluye además el rebranding de logo/favicon (la rama `feature/logo` era su base). Build OK.
    *   **Correcciones al integrar:** el backend traía el `.env.example` con **marcadores de conflicto commiteados** (merge de main sin resolver) → resuelto unificando las 4 integraciones (Google, Telegram, Discord, VAPID). El frontend se mergeó con `main` (T-11 + T-15) sin conflictos manuales.
    *   **Pendiente:** cargar las `VAPID_*` en el `.env` y probar el envío real en el navegador (suscribir + inscribirse → notificación nativa).
*   **2026-07-06 (Sesión 14):** T-15 (Google Calendar) + ronda de reglas de negocio (rama `fix/reglas-negocio-eventos`).
    *   **T-15 (frontend, mergeado):** botón "Agregar a Google Calendar" en el detalle del evento → abre el template URL de Google prellenado (título, fecha en UTC, descripción, ubicación). No usa API/OAuth de Calendar. Correcciones al revisar: `window.open` con `noopener` (anti-tabnabbing) y formato de fecha simplificado.
    *   **Reglas de negocio (backend, diseño consultado con modelo Fable):**
        *   **C-04:** `inscribirse` ahora valida el evento sobre la fila bloqueada: BORRADOR → 404, CANCELADO → 409, fecha pasada → 409. Antes dejaba inscribirse en cualquier estado/fecha. Validado en vivo (pasado → 409, futuro → 201).
        *   **C-06:** el catálogo público lista **solo PUBLICADO** (antes incluía CANCELADO); el detalle por link directo sigue accesible.
        *   **C-16:** KPI `totalEventos` cuenta solo PUBLICADO (antes inflaba con BORRADOR/CANCELADO). **Aviso:** el número baja de un día para otro, no es pérdida de datos.
        *   **C-08:** `error-handler` mapea errores de Sequelize a status semántico (unique → 409, validación/UUID inválido → 400, FK → 409) con mensaje genérico (no filtra detalle de DB); un 500 en prod ya no expone `err.message`. Esto además resuelve **C-05** (registro concurrente → 409).
    *   **Convención de status establecida:** 400 input inválido · 404 inexistente/no visible · 409 estado no admite la operación · 500 falla interna (mensaje genérico en prod).
    *   **Impacto en front a revisar:** eventos CANCELADO ya no aparecen en el catálogo → badge "Cancelado" del listado queda sin caso de uso; "mis inscripciones" debe resolver el evento por `obtenerPorId`/relación, no por `listar`.
*   **2026-07-06 (Sesión 13):** Fase 3 — Google OAuth 2.0 + 2FA (T-11), con revisión de seguridad. Toca **ambos repos**.
    *   **Alcance:** login con Google (OAuth) y segundo factor (2FA) por email. Validado de punta a punta en vivo (registro, login usuario/contraseña, 2FA y login con Google real → sesión con identidad).
    *   **Revisión de seguridad y fixes (backend):** el envío del código 2FA usaba un método inexistente (`notificacionService.enviar`) y crasheaba → ahora usa `email.service`; código generado con `crypto` y **guardado hasheado** (bcrypt) + limiter en `/2fa/verify` (fuerza bruta); registro **fuerza rol ASISTENTE** (cierra la escalada de C-02); OAuth con `state` anti-CSRF (cookie httpOnly), **token por fragment** (no en query → no queda en logs/Referer), **account-linking** por email (evita duplicar/500), `FRONTEND_URL` desde env; `down` de migración completo.
    *   **Fixes (frontend):** callback lee el token del fragment y **pide `/perfil`** para poblar `currentUser` (antes quedaba logueado sin identidad ni rol); 2FA/login usan `sessionStorage` (no `localStorage`) para el email, con manejo de error y `takeUntilDestroyed`; redirect a Google desde `environment`; tipos corregidos; `login()` ya no persiste `token=undefined` en la respuesta 2FA.
    *   **Pendiente documentado:** el JWT sigue en `localStorage` (patrón app-wide) → registrado como **C-22** en `CORRECCIONES.md` para migrar a cookie httpOnly como tarea transversal.
    *   **Recordatorio post-merge:** dependencia nueva `google-auth-library` → correr `npm install`.
*   **2026-07-05 (Sesión 12):** Fase 3 — Bot de Telegram (T-12, scope reducido).
    *   **Integración (rama `feature/telegram-bot`):** difusión grupal en el canal `@convoca_unju_2026` — anuncio de evento publicado (`telegram.service.anunciarEvento`, formato HTML, urgencia <48hs, escasez de cupo, botón/link al detalle) y aviso de cancelación (`anunciarCancelacion`). Nuevo hook `onCancelado`/`alCancelarEvento`; al cancelar, `evento.service` da de baja las inscripciones activas antes de notificar.
    *   **Scope reducido (decisión de equipo):** solo difusión a nivel grupo. Quedan fuera la vinculación de cuenta, las notificaciones personales (QR/recordatorios) y la entrega de 2FA que describía el T-12 original.
    *   **Unificación de integraciones:** al mergear con `main` (que ya traía Discord), se consolidó todo en `integrations/register.js` como hub único (Telegram publicar+cancelar, Discord publicar); `app.js` solo llama `registrarIntegraciones()` (se quitó el hook inline de Discord).
    *   **Validación:** circuito completo probado en vivo tras el merge (anuncio + cancelación en Telegram, anuncio en Discord). Sin errores.
*   **2026-07-05 (Sesión 11):** Fase 3 — Bot de Discord (T-14).
    *   **Integración (rama `feature/discord-bot`):** `integrations/discord.service.js` difunde los eventos publicados en el canal `#eventos_convoca` vía `eventosHooks.onPublicado`, sin tocar `evento.service` (aprovecha el hook). Registro del handler movido antes de `app.listen`.
    *   **Correcciones sobre el aporte inicial:** campo `evento.lugar` → `evento.ubicacion` (no existía), intents reducidos a `Guilds` (se quitó el privilegiado `GuildPresences` que podía impedir el login), limpieza de comentario/consejo inseguro, fix del deprecation `ready` → `clientReady` (discord.js v14).
    *   **Mejora del embed (revisado con modelo Fable):** aviso de urgencia (<48hs), tono de escasez por cupo, timestamps nativos de Discord (`<t:unix:F/R>`, evita el bug de timezone del servidor), escape de markdown anti-inyección, truncado de descripción, footer corregido `ConvocApp` → `Convoca`, título clickeable al detalle solo si la URL es pública.
    *   **Validación:** circuito probado en vivo (dos eventos de prueba, casos normal y urgente/escaso) → embeds correctos en el canal. `discord.js` es dependencia nueva: **correr `npm install`** tras el merge.
    *   **Pendiente (rama futura de integraciones):** CTA "Unite al Discord" (invite permanente `https://discord.gg/NM7xnE4VUN`) en el punto de captación (frontend / anuncio de Telegram), a implementar cuando Telegram esté en `main`.
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
