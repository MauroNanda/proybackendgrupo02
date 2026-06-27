# Plan de Tareas — Convoca (Grupo G02)

> **Documento vivo.** Se actualiza cada vez que se asigna, completa, modifica o agrega una tarea. Lectura obligatoria antes de tomar trabajo nuevo.

## Cómo Usar Este Documento

1.  Elegí una tarea de la fase actual cuyo **Estado** sea `LIBRE`.
2.  Avisá al equipo (canal del grupo) que la tomás. Cambiá el campo **Asignado** a tu nombre.
3.  Leé `docs/FLUJO_DE_TRABAJO.md` y `docs/CONVENCIONES.md` antes de empezar.
4.  Creá la rama exactamente con el nombre indicado en **Rama**.
5.  Tocá **solo los archivos listados** en "Archivos a crear" y "Archivos a tocar". Si necesitás tocar uno fuera de esa lista, coordiná con el equipo.
6.  Hacé commits atómicos siguiendo Conventional Commits (ver `FLUJO_DE_TRABAJO.md` §4).
7.  Al terminar: push + abrir PR a `main` + avisar.

## Estados de Tarea

| Estado | Significado |
|---|---|
| `LIBRE` | Disponible para tomar. |
| `EN PROGRESO` | Alguien la tomó, en desarrollo. |
| `EN REVISIÓN` | PR abierto, esperando merge. |
| `HECHA` | Mergeada en `main` vía PR aprobado. |
| `BLOQUEADA` | No se puede avanzar (dependencia no resuelta o duda pendiente). |

## Reglas de Conflicto sobre Archivos Compartidos

Algunos archivos los tocan todos (`models/index.js`, `routes/index.js`, `app.routes.ts`). Para evitar conflictos:

*   **Solo agregar líneas al final**, nunca modificar las existentes.
*   Si el archivo ya tiene las líneas que necesitás, no toques nada.
*   Si necesitás cambiar algo existente, **avisá antes** al equipo.

---

## Fase 0 — Proyecto Base (Scaffolding)

> **Responsable:** un único integrante construye toda la fase 0 y la pushea a `main` en ambos repos. Hasta que la Fase 0 esté `HECHA`, **nadie crea feature branches**.

### T-00-BACK — Scaffolding Backend
*   **Estado:** `EN REVISIÓN` (pushed to branch, waiting PR merge).
*   **Asignado:** Equipo (asistido por IA).
*   **Rama:** `chore/proyecto-base` (sobre el repo backend)
*   **Archivos a crear:**
    *   `package.json`, `package-lock.json`
    *   `app.js` (punto de entrada)
    *   `config/db.js` (Sequelize → Neon)
    *   `models/index.js` (autoload de modelos, vacío al inicio)
    *   `models/usuario.model.js` (modelo ejemplo, solo campos básicos: id, email, nombre)
    *   `migrations/<timestamp>-create-usuario.js` (migración ejemplo)
    *   `routes/index.js` (router central vacío)
    *   `routes/health.routes.js` (`GET /api/health`)
    *   `controllers/.gitkeep`, `services/.gitkeep`, `integrations/.gitkeep`, `seeders/.gitkeep`
    *   `middlewares/error-handler.middleware.js`
    *   `middlewares/sanitize.middleware.js` (esqueleto)
    *   `.eslintrc.json` o `eslint.config.js`
*   **Archivos a tocar:** `.gitignore` (verificar que ignora `node_modules`, `.env`).
*   **Dependencias npm mínimas:** `express`, `sequelize`, `pg`, `pg-hstore`, `dotenv`, `cors`, `helmet`, `bcrypt`, `jsonwebtoken`, `express-validator`. **Dev:** `nodemon`, `sequelize-cli`.
*   **Scripts npm:** `dev` (`nodemon app.js`), `start` (`node app.js`), `migrate`, `seed`.
*   **Criterios de aceptación:**
    *   `npm run dev` arranca sin errores.
    *   `GET http://localhost:3000/api/health` responde `{ status: "ok" }`.
    *   `npx sequelize-cli db:migrate` crea la tabla `Usuarios` en Neon.
    *   No hay credenciales hardcodeadas — todo desde `.env`.

### T-00-FRONT — Scaffolding Frontend
*   **Estado:** `EN REVISIÓN` (pushed to branch, waiting PR merge).
*   **Asignado:** Equipo (asistido por IA).
*   **Rama:** `chore/proyecto-base` (sobre el repo frontend)
*   **Archivos a crear (via `ng new` y luego manual):**
    *   Proyecto Angular 22 standalone inicializado.
    *   `src/environments/environment.ts`, `src/environments/environment.prod.ts`
    *   `src/app/core/services/api.service.ts` (HttpClient base apuntando a `environment.apiUrl`)
    *   `src/app/core/interceptors/jwt.interceptor.ts` (esqueleto)
    *   `src/app/core/guards/auth.guard.ts` (esqueleto)
    *   `src/app/core/guards/role.guard.ts` (esqueleto)
    *   `src/app/layouts/public-layout/public-layout.component.ts` (navbar Bootstrap vacío)
    *   `src/app/layouts/admin-layout/admin-layout.component.ts` (sidebar Bootstrap vacío)
    *   `src/app/features/public/home/home.component.ts` (página demo que llama `GET /api/health`)
    *   `src/app/app.routes.ts` (configurado con lazy loading)
*   **Configuración:**
    *   Bootstrap 5 instalado (`npm install bootstrap`) e importado en `styles.scss`.
    *   Bootstrap Icons opcional.
    *   `provideHttpClient(withInterceptors([jwtInterceptor]))` en `app.config.ts`.
*   **Criterios de aceptación:**
    *   `npm start` levanta Angular en `:4200`.
    *   Página home muestra el resultado de `GET /api/health` del backend.
    *   Bootstrap funciona (verificar con un `<button class="btn btn-primary">`).
    *   No hay errores en consola.

---

## Fase 1 — Asistente MVP (5 dominios en paralelo)

> **Objetivo:** un Asistente puede registrarse, ver el catálogo, inscribirse a un evento, y recibir confirmación por Email. **Demo end-to-end.**

> **Prerrequisito:** Fase 0 `HECHA` y mergeada a `main` en ambos repos.

### Dominio 1 — Auth + Seguridad

#### T-01-1 — Modelo Usuario completo + migración
*   **Estado:** `LIBRE`
*   **Asignado:** —
*   **Rama:** `feature/modelo-usuario-completo` (backend)
*   **Archivos a crear:**
    *   Migración: `migrations/<timestamp>-extender-usuario.js` (agrega `password`, `rol`, `google_id`, `telegram_id`, `two_factor_enabled`, `avatar_url`).
*   **Archivos a tocar:**
    *   `models/usuario.model.js` → ampliar definición.
*   **Dependencias:** T-00-BACK.
*   **Criterios:** `npx sequelize-cli db:migrate` aplica cambios sin errores. Modelo cargado en `models/index.js`.

#### T-01-2 — Registro + Login + JWT (backend)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/auth-jwt`
*   **Archivos a crear:**
    *   `controllers/auth.controller.js`
    *   `services/auth.service.js`
    *   `routes/auth.routes.js` (POST `/api/auth/registro`, POST `/api/auth/login`)
    *   `middlewares/auth.middleware.js` (verificar JWT)
    *   `middlewares/role.middleware.js` (verificar rol)
    *   `utils/jwt.util.js` (firmar/verificar tokens)
*   **Archivos a tocar:**
    *   `routes/index.js` → registrar `auth.routes.js` (solo agregar línea).
*   **Dependencias:** T-01-1.
*   **Criterios:** `POST /api/auth/registro` crea usuario con password bcryptado. `POST /api/auth/login` devuelve JWT válido. Middleware bloquea rutas sin token.

#### T-01-3 — Login + Registro (frontend)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/auth-frontend`
*   **Archivos a crear:**
    *   `src/app/features/auth/login/login.component.ts` (Reactive Form)
    *   `src/app/features/auth/registro/registro.component.ts` (Reactive Form)
    *   `src/app/core/services/auth.service.ts` (login/registro/logout, signal de usuario actual)
    *   `src/app/core/guards/auth.guard.ts` (implementar lógica real)
*   **Archivos a tocar:**
    *   `src/app/app.routes.ts` → agregar rutas `/login`, `/registro` (solo append).
    *   `src/app/core/interceptors/jwt.interceptor.ts` → implementar inyección de token.
*   **Dependencias:** T-01-2 (necesita endpoints).
*   **Criterios:** Login redirige a `/eventos` tras éxito. Token guardado en localStorage. Interceptor agrega `Authorization: Bearer <token>`.

### Dominio 2 — Eventos + Categorías

#### T-02-1 — Modelos Evento + Categoria + EventoCategoria
*   **Estado:** `LIBRE`
*   **Rama:** `feature/modelos-evento-categoria`
*   **Archivos a crear:**
    *   `models/evento.model.js`, `models/categoria.model.js`, `models/evento-categoria.model.js`
    *   Migraciones correspondientes.
*   **Archivos a tocar:** ninguno (los modelos se autoregistran vía `models/index.js`).
*   **Dependencias:** T-00-BACK.
*   **Criterios:** Tablas creadas en Neon. Relaciones `Evento.belongsToMany(Categoria)` funcionales.

#### T-02-2 — Listar y Detalle de Eventos (backend)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/eventos-listar-detalle`
*   **Archivos a crear:**
    *   `controllers/evento.controller.js` (solo métodos `listar` y `obtener`)
    *   `services/evento.service.js` (solo métodos `listarPublicados`, `obtenerPorId`)
    *   `routes/evento.routes.js` (GET `/api/eventos`, GET `/api/eventos/:id`)
    *   `seeders/<timestamp>-eventos-demo.js` (5 eventos PUBLICADO de muestra)
*   **Archivos a tocar:**
    *   `routes/index.js` → registrar `evento.routes.js` (append).
*   **Dependencias:** T-02-1.
*   **Criterios:** GET devuelve solo eventos PUBLICADO. Filtros por categoría funcionan vía query string.

#### T-02-3 — Catálogo y Detalle (frontend)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/catalogo-eventos`
*   **Archivos a crear:**
    *   `src/app/features/public/event-catalog/event-catalog.component.ts`
    *   `src/app/features/public/event-detail/event-detail.component.ts`
    *   `src/app/core/services/evento.service.ts`
    *   `src/app/shared/components/countdown/countdown.component.ts` (Signal-based)
*   **Archivos a tocar:**
    *   `src/app/app.routes.ts` → agregar `/eventos`, `/eventos/:id` (append).
*   **Dependencias:** T-02-2.
*   **Criterios:** Catálogo lista eventos con filtros. Detalle muestra countdown vivo. Diseño responsivo Bootstrap.

### Dominio 3 — Inscripciones + Check-in

#### T-03-1 — Modelo Inscripcion + migración
*   **Estado:** `LIBRE`
*   **Rama:** `feature/modelo-inscripcion`
*   **Archivos a crear:** `models/inscripcion.model.js`, migración.
*   **Dependencias:** T-01-1, T-02-1.
*   **Criterios:** FKs a Usuario y Evento. Estado enum `CONFIRMADO/ESPERA/CANCELADO/ASISTIO`. Campo `qr_token` único.

#### T-03-2 — Inscribirse y Cancelar (backend)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/inscripcion-crear-cancelar`
*   **Archivos a crear:**
    *   `controllers/inscripcion.controller.js`
    *   `services/inscripcion.service.js` (validar cupo, generar `qr_token` con `crypto.randomUUID()`)
    *   `routes/inscripcion.routes.js` (POST `/api/inscripciones`, DELETE `/api/inscripciones/:id`)
*   **Archivos a tocar:** `routes/index.js` (append).
*   **Dependencias:** T-03-1, T-01-2.
*   **Criterios:** Solo usuarios logueados pueden inscribirse. Validación de cupo. Cancelar cambia estado a CANCELADO.

#### T-03-3 — Botón "Inscribirme" + estado en frontend
*   **Estado:** `LIBRE`
*   **Rama:** `feature/inscripcion-frontend`
*   **Archivos a crear:**
    *   `src/app/core/services/inscripcion.service.ts`
*   **Archivos a tocar:**
    *   `src/app/features/public/event-detail/event-detail.component.ts` (agregar botón + lógica).
*   **Dependencias:** T-03-2, T-02-3.
*   **Criterios:** Botón muestra "Inscribirme"/"Cancelar" según estado. Confirmación visual.

### Dominio 4 — Notificaciones (solo Email en Fase 1)

#### T-04-1 — Modelo Notificacion + service de envío con Resend
*   **Estado:** `LIBRE`
*   **Rama:** `feature/notificaciones-email`
*   **Archivos a crear:**
    *   `models/notificacion.model.js`, migración.
    *   `integrations/email.service.js` (función `enviarEmail(destinatario, asunto, html)`)
    *   `integrations/templates/inscripcion-confirmada.html` (plantilla HTML)
*   **Archivos a tocar:** ninguno (registro automático en `models/index.js`).
*   **Dependencias:** T-00-BACK.
*   **Criterios:** Llamada a Resend funciona. Envío real verificado a una cuenta de prueba.

#### T-04-2 — Disparar Email al inscribirse
*   **Estado:** `LIBRE`
*   **Rama:** `feature/disparar-email-inscripcion`
*   **Archivos a tocar:**
    *   `services/inscripcion.service.js` → llamar a `email.service.js` tras inscripción exitosa.
*   **Dependencias:** T-04-1, T-03-2.
*   **Criterios:** Inscripción exitosa dispara email de confirmación con datos del evento.

### Dominio 5 — Dashboard + Valoraciones (preparación, sin endpoints en Fase 1)

#### T-05-1 — Modelos Valoracion + Auditoria + HistorialAcceso
*   **Estado:** `LIBRE`
*   **Rama:** `feature/modelos-auxiliares`
*   **Archivos a crear:**
    *   `models/valoracion.model.js`, migración.
    *   `models/auditoria.model.js`, migración.
    *   `models/historial-acceso.model.js`, migración.
*   **Dependencias:** T-01-1, T-02-1.
*   **Criterios:** Tablas creadas. Relaciones definidas.

#### T-05-2 — Middleware de auditoría
*   **Estado:** `LIBRE`
*   **Rama:** `feature/middleware-auditoria`
*   **Archivos a crear:**
    *   `middlewares/audit.middleware.js`
*   **Dependencias:** T-05-1.
*   **Criterios:** Middleware registra acción en tabla `AuditoriaAccion` cuando se aplica a una ruta.

---

## Fase 2 — Organizador MVP

> Se planifica al cerrar Fase 1. Bocetos:
> *   T-02-4: CRUD Evento completo (POST/PUT/DELETE) + protección por rol ORGANIZADOR.
> *   T-02-5: Frontend CRUD Eventos (`admin/event-manager`).
> *   T-03-4: Endpoint listar inscriptos por evento.
> *   T-03-5: Frontend `admin/attendee-list` con DataTable.
> *   T-05-3: Endpoint estadísticas básicas (count por evento, tasa asistencia).
> *   T-05-4: Frontend `admin/dashboard` con gráficos Chart.js.
> *   T-05-5: Exportación PDF + Excel.
> *   T-03-6: Endpoint marcar asistencia (`PUT /api/inscripciones/:id/check-in`).

## Fase 3 — Integraciones avanzadas y extras

> Bocetos:
> *   T-04-3: Telegram Bot (notificaciones + 2FA).
> *   T-04-4: Discord Bot (publicación de eventos nuevos).
> *   T-04-5: Web Push API.
> *   T-04-6: Google Calendar (link dinámico).
> *   T-01-4: Google OAuth 2.0.
> *   T-01-5: 2FA con email/Telegram.
> *   T-02-6: Eventos recurrentes (lógica de generación).
> *   T-03-7: QR scanner para check-in (frontend).
> *   T-03-8: Certificados PDF.
> *   T-03-9: Lista de espera (Waitlist).
> *   T-05-6: Pantalla de valoraciones para el Organizador.
> *   T-FRONT: PWA + Service Worker (opcional).

---

## Checkpoints de Actualización

Este documento se debe actualizar:
*   **Al cerrar cada Fase** → revisar tareas pendientes y refinar la fase siguiente.
*   **Cuando una tarea se toma** → cambiar Estado a `EN PROGRESO`, completar Asignado.
*   **Cuando se abre PR** → Estado `EN REVISIÓN`.
*   **Cuando se mergea** → Estado `HECHA`.
*   **Cuando se descubre una tarea nueva** → agregarla a la fase correspondiente con ID disponible.
*   **Cuando una tarea se bloquea** → Estado `BLOQUEADA` con nota explicando el bloqueante.

> Las actualizaciones a este archivo se hacen por rama `docs/*` y PR (ver `FLUJO_DE_TRABAJO.md`).
