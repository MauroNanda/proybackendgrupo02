# Plan de Tareas — Convoca (Grupo G02)

> **Documento vivo.** Planificación, asignación y seguimiento de las tareas del proyecto.

## Cómo Usar Este Documento
1.  **5 Integrantes = 5 Dominios:** Cada desarrollador toma **un dominio vertical completo** en la Fase 1.
2.  Elegí una tarea `LIBRE` en el resumen de abajo.
3.  Avisá al equipo por el grupo de comunicación cuál dominio vas a desarrollar. **No hace falta editar este archivo para asignártela.**
4.  Desarrollá tanto la etapa de Backend como la de Frontend en la rama indicada.
5.  Seguí las reglas de Conventional Commits y Pull Requests en `docs/FLUJO_DE_TRABAJO.md`.

---

## 📋 Resumen del Estado de Tareas (Fase 1)

| Tarea | Dominio Vertical | Estado | Enlace al detalle |
|---|---|---|---|
| **T-00** | **Proyecto Base (Scaffolding)** | `HECHA` | [Ver detalle](#t-00--proyecto-base-scaffolding) |
| **T-01** | **Auth & Seguridad (Completo)** | `HECHA` | [Ver detalle](#t-01--auth--seguridad-completo) |
| **T-02** | **Eventos & Categorías (Completo)** | `LIBRE` | [Ver detalle](#t-02--eventos--categorías-completo) |
| **T-03** | **Inscripciones & Check-in (Completo)** | `HECHA` | [Ver detalle](#t-03--inscripciones--check-in-completo) |
| **T-04** | **Notificaciones (Completo)** | `LIBRE` | [Ver detalle](#t-04--notificaciones-completo) |
| **T-05** | **Dashboard & Modelos Auxiliares** | `LIBRE` | [Ver detalle](#t-05--dashboard--modelos-auxiliares-completo) |

---

## Reglas de Conflicto sobre Archivos Compartidos
Algunos archivos los tocan todos (`models/index.js`, `routes/index.js`, `app.routes.ts`). Para evitar conflictos:
*   **Solo agregar líneas al final**, nunca modificar las existentes.
*   Si el archivo ya tiene las líneas que necesitás, no toques nada.
*   Si necesitás cambiar algo existente, **avisá antes** al equipo.

---

## Detalle de Tareas

### T-00 — Proyecto Base (Scaffolding)
*   **Estado:** `HECHA` (Mergeado en `main`).
*   **Rama:** `chore/proyecto-base`
*   **Backend:** Express + Sequelize con conexión a Neon. Estructura MVC, router central, middleware de error y sanitización, y modelo `Usuario` básico.
*   **Frontend:** Angular 22 standalone, Bootstrap 5, Bootstrap Icons, layouts dinámicos (público y administrativo) con estilos aplicados, e interceptores HTTP.

---

### T-01 — Auth & Seguridad (Completo)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/auth-completo`
*   **Descripción:** Implementar el registro, login y la seguridad JWT tanto en el servidor como en el cliente.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `migrations/<timestamp>-extender-usuario.js` (añadir `password`, `rol`, `google_id`, `telegram_id`, `two_factor_enabled`, `avatar_url` a la tabla `Usuarios`).
    *   `models/usuario.model.js` (actualizar campos).
    *   `utils/jwt.util.js` (firmar y verificar JWT).
    *   `middlewares/auth.middleware.js` (verificar token en rutas).
    *   `middlewares/role.middleware.js` (validar rol del usuario).
    *   `services/auth.service.js` y `controllers/auth.controller.js` (lógica de login/registro).
    *   `routes/auth.routes.js` (endpoints `POST /api/auth/registro` y `POST /api/auth/login`).
*   **Criterios de aceptación:** Registro hashea con bcrypt. Login retorna un token JWT válido. Rutas protegidas bloquean accesos no autorizados con un 401.

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:**
    *   `src/app/core/services/auth.service.ts` (lógica de login/logout/registro usando Angular Signals).
    *   `src/app/core/interceptors/jwt.interceptor.ts` (inyectar `Authorization: Bearer <token>`).
    *   `src/app/core/guards/auth.guard.ts` (proteger rutas del cliente).
    *   `src/app/features/auth/login/` (componente, HTML y estilos con formulario reactivo).
    *   `src/app/features/auth/registro/` (componente, HTML y estilos con formulario reactivo).
    *   `src/app/app.routes.ts` (cargar `authRoutes` vía `loadChildren`).
*   **Criterios de aceptación:** Formulario reactivo con validaciones y feedback de error. Redirección automática tras inicio de sesión exitoso.

---

### T-02 — Eventos & Categorías (Completo)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/eventos-completo`
*   **Descripción:** Implementar los modelos de eventos y categorías, posibilitando su listado y visualización detallada en el catálogo.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `models/evento.model.js`, `models/categoria.model.js` y `models/evento-categoria.model.js`.
    *   Migraciones correspondientes para las tres tablas y sus claves foráneas.
    *   `services/evento.service.js` y `controllers/evento.controller.js` (métodos de listar y detalle).
    *   `routes/evento.routes.js` (`GET /api/eventos` y `GET /api/eventos/:id`).
    *   `seeders/<timestamp>-eventos-demo.js` (crear 5 eventos en estado `PUBLICADO`).
*   **Criterios de aceptación:** `GET /api/eventos` retorna solo eventos publicados. Permite filtrar por categorías. Relaciones de base de datos validadas.

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:**
    *   `src/app/core/services/evento.service.ts` (llamadas al catálogo y detalle).
    *   `src/app/features/public/event-catalog/` (página de catálogo con filtros).
    *   `src/app/features/public/event-detail/` (página de detalle del evento).
    *   `src/app/shared/components/countdown/` (componente de cuenta regresiva basado en Signals).
    *   `src/app/app.routes.ts` (cargar `eventosRoutes` vía `loadChildren`).
*   **Criterios de aceptación:** El catálogo renderiza las tarjetas de eventos. El detalle carga dinámicamente y el contador muestra el tiempo restante en vivo.

---

### T-03 — Inscripciones & Check-in (Completo)
*   **Estado:** `HECHA`
*   **Rama:** `feature/inscripciones-completo`
*   **Descripción:** Permitir a los usuarios asistentes inscribirse o cancelar su participación en eventos, controlando el cupo disponible.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `models/inscripcion.model.js` y su migración (campos: FK usuario, FK evento, `estado` enum, `qr_token` único).
    *   `services/inscripcion.service.js` y `controllers/inscripcion.controller.js` (inscribirse y cancelar).
    *   `routes/inscripcion.routes.js` (`POST /api/inscripciones` y `DELETE /api/inscripciones/:id`).
*   **Criterios de aceptación:** Validar que el usuario esté autenticado. Controlar que no se exceda el cupo máximo del evento. Al cancelar, el estado cambia a `CANCELADO`.

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:**
    *   `src/app/core/services/inscripcion.service.ts` (enviar inscripción o cancelación).
    *   `src/app/features/public/event-detail/event-detail.component.ts` (agregar lógica al botón "Inscribirme" / "Cancelar").
*   **Criterios de aceptación:** El botón reacciona al estado de inscripción actual del usuario (cambia texto e interacción). Muestra notificaciones tipo Toast al cambiar el estado.

---

### T-04 — Notificaciones (Completo)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/notificaciones-completo`
*   **Descripción:** Crear el sistema de envío de emails transaccionales al confirmarse una inscripción en el sistema usando Resend.

#### Etapa 1: Backend (Configuración de Resend)
*   **Archivos a crear/tocar:**
    *   `models/notificacion.model.js` y su migración (auditoría de notificaciones enviadas).
    *   `integrations/email.service.js` (servicio wrapper de Resend con función `enviarEmail(destinatario, asunto, html)`).
    *   `integrations/templates/inscripcion-confirmada.html` (diseño responsivo del correo electrónico).
*   **Criterios de aceptación:** Envío de correo real exitoso a una casilla de prueba. El log de la notificación se almacena en la base de datos.

#### Etapa 2: Backend (Integración con Eventos)
*   **Archivos a crear/tocar:**
    *   `services/inscripcion.service.js` (llamar al servicio de email asincrónicamente tras una inscripción exitosa).
*   **Criterios de aceptación:** Al inscribirse a un evento, el usuario recibe automáticamente el email HTML con la confirmación y los detalles del mismo.

---

### T-05 — Dashboard & Modelos Auxiliares (Completo)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/dashboard-auxiliares-completo`
*   **Descripción:** Sentar las bases del panel de administración instalando las tablas de auditoría de seguridad, historial de accesos y valoraciones de eventos.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `models/valoracion.model.js` y su migración.
    *   `models/auditoria.model.js` y su migración.
    *   `models/historial-acceso.model.js` y su migración.
    *   `middlewares/audit.middleware.js` (middleware para registrar acciones de creación, edición y eliminación en la tabla `Auditoria`).
*   **Criterios de aceptación:** Tablas y relaciones creadas en Neon. El middleware registra las acciones ejecutadas por los usuarios autenticados correctamente.

---

## Fase 2 — Organizador MVP
> Se planifica al finalizar la Fase 1.
> *   CRUD completo de Eventos y Categorías (Organizador).
> *   Listado de inscriptos con DataTable.
> *   Dashboard administrativo con gráficos (Chart.js) y KPIs.
> *   Exportación a PDF y Excel.
> *   Registro de asistencia manual (Check-in).

## Fase 3 — Integraciones Avanzadas
> *   Bot de Telegram (Notificaciones + 2FA).
> *   Bot de Discord (Anuncio de eventos).
> *   Web Push API (Notificaciones nativas en el navegador).
> *   Google Calendar Integration.
> *   Google OAuth 2.0.
> *   Autenticación de Dos Factores (2FA).
