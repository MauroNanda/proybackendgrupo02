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
*   **Estado:** `LIBRE`
*   **Rama:** `feature/inscriptos-checkin-manual`
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
*   **Estado:** `LIBRE`
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
*   **Estado:** `LIBRE`
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
*   **Estado:** `LIBRE`
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

## 🚀 Fase 3 — Integraciones Avanzadas
> *   Bot de Telegram (Notificaciones + 2FA).
> *   Bot de Discord (Anuncio de eventos).
> *   Web Push API (Notificaciones nativas en el navegador).
> *   Google Calendar Integration.
> *   Google OAuth 2.0.
> *   Autenticación de Dos Factores (2FA).
