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
| **T-02** | **Eventos & Categorías (Completo)** | `HECHA` | [Ver detalle](#t-02--eventos--categorías-completo) |
| **T-03** | **Inscripciones & Check-in (Completo)** | `HECHA` | [Ver detalle](#t-03--inscripciones--check-in-completo) |
| **T-04** | **Notificaciones (Completo)** | `HECHA` | [Ver detalle](#t-04--notificaciones-completo) |
| **T-05** | **Dashboard & Modelos Auxiliares** | `HECHA` | [Ver detalle](#t-05--dashboard--modelos-auxiliares-completo) |

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
*   **Estado:** `HECHA`
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
*   **Estado:** `HECHA`
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
*   **Estado:** `HECHA`
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

## 📋 Detalle de Tareas — Fase 2 (Organizador MVP)

### T-06 — Listado de Inscriptos & Check-in Manual
*   **Estado:** `COMPLETO`
*   **Rama:** `feature/diseno-inscriptos-corporativo`
*   **Descripción:** Permitir al organizador visualizar la lista de usuarios inscriptos a un evento y registrar su asistencia manualmente desde la interfaz administrativa.
*   **Etapa 1: Backend**
    *   **Archivos a crear/tocar:**
        *   `routes/inscripcion.routes.js` y `controllers/inscripcion.controller.js`.
        *   Crear endpoint: `GET /api/inscripciones/evento/:eventoId` (retorna lista de asistentes filtrada por estado y buscador de nombre/email).
        *   Crear endpoint: `POST /api/inscripciones/:id/check-in-manual` (actualiza estado a `ASISTIO` sin requerir token QR).
    *   **Consejos de Integración (Basado en errores de Fase 1):**
        *   ⚠️ *Middleware:* Recordar que el usuario autenticado se inyecta en `req.usuario` (Gabriel/T-01) y **no** en `req.user`.
        *   ⚠️ *Búsquedas:* Usar `Sequelize.Op.iLike` para la barra de búsqueda de texto de forma insensible a mayúsculas/minúsculas.
        *   ⚠️ *Seguridad:* Proteger endpoints con `authMiddleware` y `roleMiddleware(['ORGANIZADOR'])`.
*   **Etapa 2: Frontend**
    *   **Archivos a crear/tocar:**
        *   `src/app/core/services/inscripcion.service.ts` (métodos `obtenerPorEvento` y `checkInManual`).
        *   `src/app/features/admin/attendees/` (tabla Bootstrap con buscadores, paginación y botón de asistencia).
        *   `src/app/app.routes.ts` (registrar ruta `/admin/eventos/:id/inscriptos` protegida por Guards).
    *   **Criterios de Aceptación:** Vista interactiva responsive usando Signals. El cambio de asistencia actualiza la fila al instante con feedback visual.

---

### T-07 — Exportación y Reportes (PDF y Excel)
*   **Estado:** `COMPLETO`
*   **Rama:** `feature/exportacion-reportes`
*   **Descripción:** Añadir servicios del lado del cliente para exportar la lista de inscriptos a Excel y descargar los pases confirmados (tickets) a PDF.
*   **Etapa 1: Frontend**
    *   **Archivos a crear/tocar:**
        *   `src/app/core/services/export.service.ts` (métodos `exportarExcel(datos, filename)` usando `xlsx` y `descargarPdf(elementoHtmlId, filename)` usando `html2canvas` y `jspdf`).
        *   `src/app/features/admin/test-export/test-export.component.ts` (pantalla aislada para depuración).
        *   `src/app/app.routes.ts` (montar ruta `/admin/test-export` solo para testing).
    *   **Consejos de Integración (Basado en errores de Fase 1):**
        *   ⚠️ *Subida a Git:* Asegurarse de commitear todas las carpetas nuevas (`test-export/`) antes de abrir la PR para evitar compilar con archivos faltantes.
        *   ⚠️ *Tip de jspdf/html2canvas:* Usar `scale: 2` en el renderizado de `html2canvas` para garantizar que los códigos QR no salgan borrosos en el PDF final.
*   **Criterios de Aceptación:** Un clic descarga un Excel correcto con las cabeceras deseadas, y la descarga de PDF genera un pase con el diseño enterprise intacto.

---

### T-08 — ABM de Categorías
*   **Estado:** `COMPLETO`
*   **Rama:** `feature/abm-categorias`
*   **Descripción:** Crear el panel administrativo para que el organizador administre (lista, crea, edita, elimina) las categorías de eventos disponibles.
*   **Etapa 1: Backend**
    *   **Archivos a crear/tocar:**
        *   Crear: `routes/categoria.routes.js`, `controllers/categoria.controller.js` y `services/categoria.service.js`.
    *   **Consejos de Integración (Basado en errores de Fase 1):**
        *   ⚠️ *Loader de Sequelize:* El archivo `models/index.js` pasa solo `(sequelize)`. **No** utilices `(sequelize, DataTypes)` en la definición de nuevos modelos. Importa `{ DataTypes } = require('sequelize')` al inicio del archivo.
*   **Etapa 2: Frontend**
    *   **Archivos a crear/tocar:**
        *   `src/app/features/admin/categories/` (pantallas de listado y formularios modales de alta/edición).
        *   `src/app/app.routes.ts` (registrar ruta `/admin/categorias`).
    *   **Criterios de Aceptación:** CRUD 100% funcional. Si una categoría es borrada, no debe romper los eventos existentes (usar onDelete: SET NULL o validar que no tenga eventos vinculados).

---

### T-09 — ABM de Eventos
*   **Estado:** `COMPLETO`
*   **Rama:** `feature/abm-eventos`
*   **Descripción:** Implementar el panel administrativo para publicar, listar y modificar los eventos institucionales, incluyendo su vinculación con múltiples categorías.
*   **Etapa 1: Backend**
    *   **Archivos a crear/tocar:**
        *   `services/evento.service.js` y `controllers/evento.controller.js` (agregar métodos de creación y edición vinculando categorías en la tabla intermedia).
    *   **Consejos de Integración (Basado en errores de Fase 1):**
        *   ⚠️ *Cuidado de Modelos:* El modelo `Evento` ya posee las relaciones `belongsToMany` con categorías y `hasMany` con inscripciones. Mantener el bloque `associate` intacto.
*   **Etapa 2: Frontend**
    *   **Archivos a crear/tocar:**
        *   `src/app/features/admin/events/` (listado administrativo de eventos, formulario de alta con selectores de fecha, cupos y categorías).
        *   `src/app/app.routes.ts` (rutas `/admin/eventos/crear` y `/admin/eventos/editar/:id`).
    *   **Criterios de Aceptación:** Integridad completa de campos. Validación reactiva en el cliente previniendo cupos menores a 1 o fechas pasadas.

---

### T-10 — Dashboard Administrativo con KPIs & Gráficos
*   **Estado:** `LIBRE`
*   **Rama:** `feature/dashboard-kpis`
*   **Descripción:** Reemplazar el placeholder administrativo por un panel integrado con KPIs y gráficos de rendimiento sobre las métricas del sistema.
*   **Etapa 1: Backend**
    *   **Archivos a crear/tocar:**
        *   Crear `routes/dashboard.routes.js`, `controllers/dashboard.controller.js`, `services/dashboard.service.js`.
        *   Endpoints: `GET /api/dashboard/kpis` (retorna total de usuarios, eventos registrados y promedio de valoraciones) y `GET /api/dashboard/charts` (datos formateados por mes o categoría).
    *   **Consejos de Integración (Basado en errores de Fase 1):**
        *   ⚠️ *Mapeo ORM:* El modelo `Valoracion` fue configurado con `timestamps: false` para coincidir con la migración. El modelo `Auditoria` usa la tabla física `'Auditoria'` con `created_at` mapeado.
*   **Etapa 2: Frontend**
    *   **Archivos a crear/tocar:**
        *   `src/app/features/admin/dashboard/` (componente principal, renderizado de gráficos de barras y tortas usando `Chart.js` de manera reactiva).
        *   `src/app/app.routes.ts` (conectar `/admin/dashboard` reemplazando el placeholder).
    *   **Criterios de Aceptación:** Pantalla interactiva visualmente premium, con KPIs que muestren contadores animados y gráficos funcionales al cambiar el rango de fechas.

---

## 📋 Detalle de Tareas — Fase 3 (Integraciones Avanzadas)

> **Terreno preparado (rama `feature/fase3-preparacion`):** ya existe un **hub de notificaciones** (`integrations/notificaciones.js` + `integrations/channels/`) y un **sistema de hooks de eventos** (`integrations/eventos.hooks.js`). Gracias a esto, agregar Telegram, Web Push o Discord **no requiere tocar los servicios de negocio** (`inscripcion.service.js`, `evento.service.js`): alcanza con crear un archivo de canal/handler y registrarlo. Ver `integrations/README.md`.
>
> **APIs externas de la fase:** Google OAuth, Telegram, Discord, Web Push, Google Calendar (5 → cumple el mínimo de 4 de la consigna).

| Tarea | Dominio | Dificultad | Toca Front | Estado |
|---|---|---|---|---|
| **T-11** | Google OAuth 2.0 (+ 2FA opcional) | 🟡 Media | Sí | `✅ HECHO` |
| **T-12** | Telegram Bot (difusión) | 🟢 Fácil-media | No | `✅ HECHO` |
| **T-13** | Web Push (+ PWA opcional) | 🔴 Difícil | Sí | `LIBRE` |
| **T-14** | Discord Bot | 🟢 Fácil-media | No | `✅ HECHO` |
| **T-15** | Google Calendar | 🟢 Fácil | Solo front | `✅ HECHO` |

---

### T-11 — Google OAuth 2.0 (+ 2FA opcional)
*   **Estado:** `✅ HECHO` — login con Google + 2FA por email, validado en vivo (registro/login/2FA/OAuth end-to-end). Revisión de seguridad aplicada (ver changelog Sesión 13 y `CORRECCIONES.md` C-22).
*   **Rama:** `feature/auth-oauth-2fa`
*   **Dificultad:** 🟡 Media. **Requisito de consigna** (§5: "Login social con APIs de Google (OAuth)").
*   **Descripción:** Permitir iniciar sesión / registrarse con cuenta de Google. Como add-on **opcional** (suma en la rúbrica de seguridad), verificación en dos pasos (2FA) por usuario.
*   **Circuito (OAuth):** `clic "Login Google"` → front redirige a `/api/auth/google` → consentimiento Google → `/api/auth/google/callback?code` → back canjea el `code` por el perfil → busca `Usuario` por `google_id`/`email`, si no existe lo crea (rol `ASISTENTE`) → firma JWT → redirige al front con el token → `AuthService` lo guarda → sesión iniciada.
*   **Circuito (2FA opt-in):** login con password → si `two_factor_enabled` → **no** entrega JWT, genera código de 6 dígitos (con expiración) y lo envía por el hub (email/Telegram) → responde "2FA requerido" → el usuario ingresa el código en `POST /api/auth/2fa/verify` → si es válido y no expiró, recién ahí se entrega el JWT.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `services/auth.service.js` y `controllers/auth.controller.js` (rama OAuth: crear/mapear usuario por `google_id`; rama 2FA: partir el login en dos pasos).
    *   `routes/auth.routes.js` (nuevos endpoints: `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/2fa/verify`, `POST /auth/2fa/enable`, `POST /auth/2fa/disable`).
    *   `migrations/<timestamp>-2fa-y-oauth.js` (campos para el código 2FA temporal: `codigo_2fa`, `codigo_2fa_expira`; y cambiar el default de `two_factor_enabled` a **`false`**).
    *   `models/usuario.model.js` (ajustar default de `two_factor_enabled`; los campos `google_id`/`avatar_url` ya existen).
*   **Consejos de Integración:**
    *   ⚠️ `auth.service.js` lo toca **solo esta tarea** (evitar conflictos con el resto del equipo).
    *   ⚠️ El envío del código 2FA usa el hub de notificaciones ya existente (no reimplementar el email).
*   **Deps / Env:** `google-auth-library`. Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`. Config previa: crear credenciales OAuth en Google Cloud Console.
*   **Criterios de aceptación:** El login con Google crea/reusa el usuario y devuelve un JWT válido. Con 2FA activo, el password solo no alcanza: sin código válido no se entrega JWT. El 2FA es **opt-in** (apagado por defecto).

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:**
    *   Botón "Login con Google" en `login/` y `registro/` (la UI ya está maquetada) → redirige al endpoint del backend.
    *   `features/auth/oauth-callback/` (recibe el token del redirect y lo guarda vía `AuthService`).
    *   `features/.../perfil/` sección "Seguridad": switch de 2FA + pantalla de ingreso de código.
*   **Criterios de aceptación:** El flujo de Google redirige y deja la sesión iniciada. El toggle de 2FA vive en el perfil (no en pantallas públicas) y refleja el estado real de la cuenta.

---

### T-12 — Telegram Bot
*   **Estado:** `✅ HECHO` — mergeado a `main`. Circuito validado en vivo (canal `@convoca_unju_2026`: anuncio + cancelación).
*   **Rama:** `feature/telegram-bot`
*   **⚠️ Scope reducido (decisión de equipo):** se implementó **solo la difusión a nivel grupo** (anuncio de evento publicado + aviso de cancelación al canal, con baja de inscripciones activas al cancelar). **NO** incluye la vinculación de cuenta (`/start`, `telegram_id`), las notificaciones personales (QR, recordatorios) ni la entrega de 2FA descriptas abajo; esas quedan fuera del alcance actual.
*   **Dificultad:** 🔴 Difícil (ciclo de vida del bot + vinculación de cuenta).
*   **Descripción:** Bot de Telegram para vincular la cuenta y enviar notificaciones (confirmación de inscripción, QR, recordatorios). Además actúa como canal de entrega del código 2FA de T-11.
*   **Circuito (vinculación):** usuario en su perfil → "Vincular Telegram" → el backend genera un token corto ligado a su `id` → el front muestra el deeplink `t.me/<bot>?start=<token>` → el usuario abre Telegram y hace `/start` → el bot resuelve el token → guarda `Usuario.telegram_id` → confirma en el chat.
*   **Circuito (notificación):** usuario se inscribe → `inscripcion.service` → **hub de notificaciones** → `telegram.channel.inscripcionConfirmada(usuario, evento)` → si hay `telegram_id`, el bot manda el mensaje + QR.

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `integrations/telegram.service.js` (inicialización del bot, `enviarMensaje(telegram_id, texto)`, manejo de `/start`).
    *   `integrations/channels/telegram.channel.js` (implementa `inscripcionConfirmada`, `cupoLiberado`, etc.) y registrarlo en `integrations/notificaciones.js` (**una línea**).
    *   Endpoint para generar el token de vinculación (en `auth`/`usuario`).
*   **Consejos de Integración:**
    *   ✅ Gracias al hub, **no hace falta tocar `inscripcion.service.js`**.
    *   ⚠️ El campo `Usuario.telegram_id` ya existe.
*   **Deps / Env:** `telegraf`. Env: `TELEGRAM_BOT_TOKEN`. Config previa: crear el bot con @BotFather.

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:** sección "Seguridad"/"Integraciones" del perfil → botón "Vincular Telegram" que muestra el deeplink.
*   **Criterios de aceptación:** Tras `/start`, la cuenta queda vinculada y las inscripciones llegan por Telegram a los usuarios vinculados.

---

### T-13 — Web Push (+ PWA opcional)
*   **Estado:** `LIBRE`
*   **Rama:** `feature/web-push`
*   **Dificultad:** 🔴 Difícil (service worker + VAPID + nuevo modelo).
*   **Descripción:** Notificaciones nativas del navegador/SO. Opcionalmente, convertir la app en PWA instalable (cubre el punto opcional de la consigna §3).
*   **Circuito (suscripción):** usuario logueado → el service worker (front) pide permiso → obtiene la `PushSubscription` (endpoint + keys) → `POST /api/push/subscribe` → el backend la guarda en la tabla `PushSubscription` (ligada a `usuario_id`).
*   **Circuito (notificación):** inscripción/recordatorio → **hub** → `push.channel` → `web-push` envía al endpoint → el navegador muestra la notificación nativa (incluso con la pestaña cerrada, vía SW).

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `models/push-subscription.model.js` + su migración (`usuario_id`, `endpoint`, `keys`).
    *   `routes/push.routes.js` y `controllers/push.controller.js` (`POST /push/subscribe`).
    *   `integrations/channels/push.channel.js` + registrarlo en el hub (**una línea**).
*   **Deps / Env:** `web-push`. Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

#### Etapa 2: Frontend
*   **Archivos a crear/tocar:** service worker (push), `PushService` (pedir permiso, registrar suscripción). Opcional: `@angular/service-worker` para la PWA.
*   **Criterios de aceptación:** El usuario que acepta el permiso recibe una notificación nativa al inscribirse. La suscripción queda persistida por usuario.

---

### T-14 — Discord Bot
*   **Estado:** `✅ HECHO` — mergeado a `main`. Circuito validado en vivo (bot `convoca_unju_2026`, canal `#eventos_convoca`).
*   **Rama:** `feature/discord-bot`
*   **Notas de cierre:** embed enriquecido (urgencia <48hs, tono de escasez por cupo, timestamps nativos de Discord, escape de markdown anti-inyección, título clickeable solo con URL pública). Pendiente para una rama futura de integraciones: CTA "Unite al Discord" (invite `DISCORD_INVITE_URL`) en el punto de captación (frontend / anuncio de Telegram), a hacer una vez que Telegram esté en `main`.
*   **Dificultad:** 🟢 Fácil-media (**solo backend**, superficie chica).
*   **Descripción:** Difundir automáticamente los eventos nuevos en un canal de Discord del servidor de la comunidad.
*   **Circuito:** el organizador publica un evento → `evento.service` → `eventosHooks.alPublicarEvento(evento)` → handler de Discord → `discord.service.anunciar(evento)` → el bot postea un embed en el canal → los miembros lo ven. (Unidireccional sistema → Discord.)

#### Etapa 1: Backend
*   **Archivos a crear/tocar:**
    *   `integrations/discord.service.js` (bot + `anunciarEvento(evento)`).
    *   Registrar el handler con `eventosHooks.onPublicado(...)` al arrancar la app.
*   **Consejos de Integración:**
    *   ✅ Gracias al hook, **no hace falta tocar `evento.service.js`**.
*   **Deps / Env:** `discord.js`. Env: `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`. Config previa: crear la app/bot en el Discord Developer Portal e invitarlo al server.
*   **Criterios de aceptación:** Al publicar un evento, aparece el anuncio en el canal de Discord. Un fallo de Discord no rompe el alta/edición del evento (el hook aísla el error).

---

### T-15 — Google Calendar
*   **Estado:** `LIBRE`
*   **Rama:** `feature/google-calendar`
*   **Dificultad:** 🟢 Fácil (**solo frontend**, sin backend ni deps).
*   **Descripción:** Botón "Agregar a Google Calendar" en el detalle del evento.
*   **Circuito:** usuario en el detalle del evento → clic "Agendar" → el front arma la URL `calendar.google.com/render?action=TEMPLATE&text=...&dates=...&location=...` con los datos del evento → abre una pestaña de Google Calendar prellenada → el usuario confirma en **su** calendario. Todo client-side.

#### Etapa 1: Frontend
*   **Archivos a crear/tocar:**
    *   `features/public/event-detail/` (función que construye la URL a partir del evento) + botón.
*   **Consejos de Integración:**
    *   La versión simple **no requiere OAuth**. La versión avanzada (crear el evento vía API en el calendario del usuario) reutilizaría el OAuth de T-11.
*   **Criterios de aceptación:** El botón abre Google Calendar con el título, fecha/hora y ubicación del evento ya cargados.
