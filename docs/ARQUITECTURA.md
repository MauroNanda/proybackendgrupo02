# Arquitectura del Sistema (MVC con Capa de Servicios)

> **Nota:** La consigna exige patrón MVC en el backend. Se utiliza MVC como estructura visible de carpetas, complementado con una capa de Servicios para mantener los controladores delgados y el código limpio.

## 1. Diseño de Base de Datos (Esquema ER)
El sistema utiliza PostgreSQL (Neon.tech) gestionado por Sequelize.

### Entidades Principales
*   **Usuario**
    *   `id` (PK, UUID)
    *   `nombre`, `email` (Unique), `password` (hash bcrypt)
    *   `avatar_url` (String, nullable)
    *   `rol` (Enum: `ORGANIZADOR`, `ASISTENTE`)
    *   `google_id` (String, nullable — para OAuth)
    *   `telegram_id` (String, nullable)
    *   `push_subscription` (JSON, nullable)
    *   `two_factor_enabled` (Boolean, default true)
*   **Evento**
    *   `id` (PK, UUID)
    *   `titulo`, `descripcion`
    *   `imagen_portada` (String, nullable)
    *   `fecha_inicio`, `fecha_fin`
    *   `lugar`
    *   `cupo_maximo` (Integer)
    *   `estado` (Enum: `BORRADOR`, `PUBLICADO`, `FINALIZADO`)
    *   `es_recurrente` (Boolean)
    *   `frecuencia` (Enum: `SEMANAL`, `QUINCENAL`, `MENSUAL`, nullable)
    *   `evento_padre_id` (FK -> Evento, nullable)
    *   `creador_id` (FK -> Usuario)
*   **Categoria**
    *   `id` (PK, UUID)
    *   `nombre` (String, Unique)
*   **EventoCategoria** (Tabla intermedia N:M)
    *   `evento_id` (FK -> Evento)
    *   `categoria_id` (FK -> Categoria)
*   **Inscripcion**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK -> Usuario)
    *   `evento_id` (FK -> Evento)
    *   `estado` (Enum: `CONFIRMADO`, `ESPERA`, `CANCELADO`, `ASISTIO`)
    *   `qr_token` (String, Unique)
    *   `posicion_espera` (Integer, nullable)
*   **Valoracion**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK -> Usuario)
    *   `evento_id` (FK -> Evento)
    *   `puntuacion` (Integer, 1-5)
    *   `comentario` (Text, nullable)
*   **Notificacion**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK -> Usuario)
    *   `titulo`, `mensaje`
    *   `leida` (Boolean, default false)
    *   `tipo` (Enum: `INSCRIPCION`, `RECORDATORIO`, `CUPO_LIBERADO`, `EVENTO_NUEVO`)

### Entidades de Seguridad
*   **AuditoriaAccion**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK -> Usuario)
    *   `accion` (String — ej: "CREAR_EVENTO", "INSCRIBIRSE", "CANCELAR_INSCRIPCION")
    *   `entidad` (String — ej: "Evento", "Inscripcion")
    *   `entidad_id` (UUID — ID del recurso afectado)
    *   `detalle` (JSON, nullable — datos adicionales)
    *   `ip` (String)
    *   `created_at` (Timestamp)
*   **HistorialAcceso**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK -> Usuario)
    *   `fecha` (Timestamp)
    *   `ip` (String)
    *   `user_agent` (String)
    *   `exitoso` (Boolean)

### Relaciones Principales
*   Usuario (Organizador) → tiene muchos → Eventos (1:N)
*   Usuario (Asistente) → tiene muchas → Inscripciones (1:N)
*   Evento → tiene muchas → Inscripciones (1:N)
*   Evento ↔ Categoria → a través de EventoCategoria (N:M)
*   Evento → tiene muchas → Valoraciones (1:N)
*   Evento (recurrente) → tiene muchos → Eventos hijos (1:N auto-referencial)
*   Usuario → tiene muchas → Notificaciones (1:N)
*   Usuario → tiene muchas → AuditoriaAccion (1:N)
*   Usuario → tiene muchos → HistorialAcceso (1:N)

---

## 2. Arquitectura de Backend (Node/Express — MVC)
> *Exigencia de la consigna: "El sistema deberá respetar el patrón de arquitectura MVC en backend".*

La estructura de carpetas sigue MVC clásico con una capa de Servicios adicional para separar la lógica de negocio de los controladores.

```text
proybackendgrupoXX/
 ├── config/
 │   ├── db.js                  # Conexión Sequelize a Neon.tech
 │   ├── passport.js            # Configuración Google OAuth
 │   └── push.js                # Configuración Web Push (VAPID keys)
 ├── controllers/
 │   ├── auth.controller.js
 │   ├── evento.controller.js
 │   ├── inscripcion.controller.js
 │   ├── valoracion.controller.js
 │   ├── notificacion.controller.js
 │   └── usuario.controller.js
 ├── models/
 │   ├── usuario.model.js
 │   ├── evento.model.js
 │   ├── categoria.model.js
 │   ├── inscripcion.model.js
 │   ├── valoracion.model.js
 │   ├── notificacion.model.js
 │   ├── auditoria.model.js
 │   ├── historial-acceso.model.js
 │   └── index.js               # Registra todos los modelos y relaciones
 ├── routes/
 │   ├── auth.routes.js
 │   ├── evento.routes.js
 │   ├── inscripcion.routes.js
 │   ├── valoracion.routes.js
 │   ├── notificacion.routes.js
 │   ├── usuario.routes.js
 │   └── index.js               # Agrupa todas las rutas
 ├── services/                  # Capa adicional: lógica de negocio
 │   ├── auth.service.js
 │   ├── evento.service.js
 │   ├── inscripcion.service.js
 │   ├── valoracion.service.js
 │   └── notificacion.service.js
 ├── integrations/              # Módulos de APIs externas
 │   ├── telegram.bot.js
 │   ├── discord.bot.js
 │   ├── email.service.js       # Resend / Nodemailer
 │   └── push.service.js        # Web Push
 ├── middlewares/
 │   ├── auth.middleware.js      # Verificación JWT
 │   ├── role.middleware.js      # Verificación de rol
 │   ├── audit.middleware.js     # Registra acciones en AuditoriaAccion
 │   └── sanitize.middleware.js  # Prevención XSS/inyecciones
 ├── migrations/                # Migraciones de Sequelize
 ├── seeders/                   # Datos de prueba
 ├── .env
 ├── .env.example
 ├── .gitignore
 ├── package.json
 └── app.js                     # Punto de entrada
```

---

## 3. Arquitectura de Frontend (Angular 22 — Doble Vista)

```text
proyfrontendgrupoXX/src/app
 ├── core/                          # Servicios singleton, Guards, Interceptors
 │   ├── guards/
 │   │   ├── auth.guard.ts          # ¿Está logueado?
 │   │   └── role.guard.ts          # ¿Es Organizador?
 │   ├── interceptors/
 │   │   └── jwt.interceptor.ts     # Agrega JWT a cada request HTTP
 │   └── services/
 │       ├── auth.service.ts
 │       ├── notification.service.ts
 │       └── export.service.ts      # PDF y Excel
 ├── shared/                        # Componentes reutilizables
 │   ├── components/                # (countdown, star-rating, qr-viewer, etc.)
 │   └── pipes/                     # (ej. timeAgo, truncate)
 ├── layouts/                       # Layouts separados por rol
 │   ├── public-layout/             # Navbar Bootstrap + footer para Asistentes
 │   └── admin-layout/              # Sidebar + header para Organizadores
 ├── features/
 │   ├── auth/                      # Login, Registro, OAuth Google, 2FA
 │   ├── public/                    # === VISTA ASISTENTE ===
 │   │   ├── event-catalog/         # Listado con filtros y búsqueda
 │   │   ├── event-detail/          # Detalle con countdown e inscripción
 │   │   ├── recommendations/       # "Recomendados para ti"
 │   │   ├── user-profile/          # Perfil, historial, certificados
 │   │   └── rate-event/            # Valoración post-evento
 │   └── admin/                     # === VISTA ORGANIZADOR ===
 │       ├── dashboard/             # Gráficos Chart.js + métricas
 │       ├── event-manager/         # CRUD de eventos (incluye recurrentes)
 │       ├── attendee-list/         # DataTable + exportar PDF/Excel
 │       ├── qr-scanner/            # Escaneo QR para check-in
 │       └── event-feedback/        # Ver valoraciones recibidas
 └── app.routes.ts                  # Ruteador con lazy loading por layout
```
