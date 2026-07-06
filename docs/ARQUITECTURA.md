# Arquitectura del Sistema (MVC con Capa de Servicios)

> **Nota:** La consigna exige patrón MVC en el backend. Se utiliza MVC como estructura visible de carpetas, complementado con una capa de Servicios que concentra la lógica de negocio y mantiene los controladores delgados.

## 1. Diseño de Base de Datos

El sistema utiliza PostgreSQL (alojado en Neon.tech) gestionado por Sequelize. El esquema se define y evoluciona mediante migraciones (`migrations/`). Todos los identificadores primarios son UUID. Salvo indicación contraria, las tablas incluyen los timestamps `createdAt` / `updatedAt` de Sequelize.

### Entidades Principales

*   **Usuarios**
    *   `id` (PK, UUID)
    *   `nombre`, `username` (Unique, nullable), `email` (Unique)
    *   `password` (hash bcrypt, nullable — los usuarios que ingresan solo con Google no tienen contraseña local; excluido de las consultas por defecto mediante scope)
    *   `rol` (Enum: `ORGANIZADOR`, `ASISTENTE` — default `ASISTENTE`)
    *   `google_id` (String, nullable — vínculo con la cuenta de Google para OAuth)
    *   `telegram_id` (String, nullable)
    *   `two_factor_enabled` (Boolean, default false)
    *   `codigo_2fa` (String, nullable) y `codigo_2fa_expira` (Date, nullable) — código temporal del segundo factor y su vencimiento
    *   `avatar_url` (String, nullable)
*   **Eventos**
    *   `id` (PK, UUID)
    *   `titulo`, `descripcion`
    *   `fecha` (Date)
    *   `ubicacion` (String)
    *   `cupo_maximo` (Integer)
    *   `estado` (Enum: `BORRADOR`, `PUBLICADO`, `CANCELADO` — default `BORRADOR`)
    *   `recordatorio_enviado_en` (Date, nullable — marca cuándo se envió el recordatorio de 24 horas; `NULL` significa pendiente. La usa la tarea programada de `jobs/recordatorios.job.js`)
*   **Categorias**
    *   `id` (PK, UUID)
    *   `nombre` (String, Unique)
*   **EventoCategorias** (tabla intermedia N:M, sin timestamps)
    *   `eventoId` (FK → Eventos)
    *   `categoriaId` (FK → Categorias)
*   **Inscripciones**
    *   `id` (PK, UUID)
    *   `usuarioId` (FK → Usuarios)
    *   `eventoId` (FK → Eventos)
    *   `estado` (Enum: `CONFIRMADO`, `ESPERA`, `CANCELADO`, `ASISTIO` — default `CONFIRMADO`)
    *   `qr_token` (UUID, Unique — se genera al inscribirse y se valida en el check-in)
    *   Índices: (`eventoId`, `estado`) y (`usuarioId`) para las consultas de cupo y de historial
*   **Valoracion** (sin timestamps)
    *   `id` (PK, UUID)
    *   `usuario_id` (FK → Usuarios)
    *   `evento_id` (FK → Eventos)
    *   `puntuacion` (Integer, 1-5)
    *   `comentario` (Text, nullable)
*   **Notificaciones**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK → Usuarios)
    *   `titulo`, `mensaje`
    *   `leida` (Boolean, default false)
    *   `tipo` (Enum: `INSCRIPCION`, `RECORDATORIO`, `CUPO_LIBERADO`, `EVENTO_NUEVO`, `EVENTO_CANCELADO`, `EVENTO_MODIFICADO`)
*   **PushSubscriptions**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK → Usuarios)
    *   `endpoint` (Text, Unique — URL de entrega del navegador)
    *   `keys` (JSONB — claves de cifrado de la suscripción Web Push)
    *   Un usuario puede tener varias suscripciones (por ejemplo, navegador de PC y de celular).

### Entidades de Seguridad

*   **Auditoria** (modelo `AuditoriaAccion`)
    *   `id` (PK, UUID)
    *   `usuario_id` (FK → Usuarios)
    *   `accion` (String — ej.: "CREAR_EVENTO", "INSCRIBIRSE")
    *   `entidad` (String — ej.: "Evento", "Inscripcion") y `entidad_id` (UUID, nullable)
    *   `detalle` (JSONB, nullable — datos adicionales de la acción)
    *   `ip` (String, nullable)
    *   `created_at` (Timestamp)
*   **HistorialAcceso**
    *   `id` (PK, UUID)
    *   `usuario_id` (FK → Usuarios)
    *   `fecha` (Timestamp)
    *   `ip` (String, nullable)
    *   `user_agent` (String, nullable)
    *   `exitoso` (Boolean — registra tanto ingresos correctos como intentos fallidos)

### Relaciones

*   Usuario → tiene muchas → Inscripciones (1:N)
*   Evento → tiene muchas → Inscripciones (1:N)
*   Evento ↔ Categoria → a través de EventoCategorias (N:M)
*   Usuario → tiene muchas → Valoraciones; Evento → tiene muchas → Valoraciones (1:N)
*   Usuario → tiene muchas → Notificaciones (1:N)
*   Usuario → tiene muchas → PushSubscriptions (1:N)
*   Usuario → tiene muchas → Auditoria (1:N)
*   Usuario → tiene muchos → HistorialAcceso (1:N)

Los modelos se registran automáticamente en `models/index.js`, que recorre la carpeta, carga cada archivo `*.model.js` y luego ejecuta el método `associate` de cada modelo para declarar las relaciones.

---

## 2. Arquitectura de Backend (Node/Express — MVC)

> *Exigencia de la consigna: "El sistema deberá respetar el patrón de arquitectura MVC en backend".*

Flujo de una petición: **ruta → middlewares → controlador → servicio → modelo**. Los controladores solo traducen HTTP (leen la request, responden JSON); los servicios contienen las reglas de negocio y hablan con los modelos.

```text
proybackendgrupo02/
 ├── config/
 │   ├── db.js                      # Conexión Sequelize a Neon.tech
 │   └── sequelize-cli.config.js    # Configuración para migraciones (sequelize-cli)
 ├── controllers/
 │   ├── auth.controller.js         # Registro, login, OAuth Google, 2FA, sesión
 │   ├── usuario.controller.js
 │   ├── evento.controller.js
 │   ├── categoria.controller.js
 │   ├── inscripcion.controller.js
 │   ├── notificacion.controller.js
 │   ├── push.controller.js         # Alta/baja de suscripciones Web Push
 │   └── dashboard.controller.js    # Métricas para el panel del organizador
 ├── models/
 │   ├── usuario.model.js
 │   ├── evento.model.js
 │   ├── categoria.model.js
 │   ├── evento-categoria.model.js
 │   ├── inscripcion.model.js
 │   ├── valoracion.model.js
 │   ├── notificacion.model.js
 │   ├── push-subscription.model.js
 │   ├── auditoria.model.js
 │   ├── historial-acceso.model.js
 │   └── index.js                   # Carga los modelos y ejecuta las asociaciones
 ├── routes/
 │   ├── auth.routes.js
 │   ├── usuario.routes.js
 │   ├── evento.routes.js
 │   ├── categoria.routes.js
 │   ├── inscripcion.routes.js
 │   ├── notificacion.routes.js
 │   ├── push.routes.js
 │   ├── dashboard.routes.js
 │   ├── health.routes.js           # Verificación de estado del servidor
 │   └── index.js                   # Agrupa todas las rutas bajo /api
 ├── services/                      # Lógica de negocio
 │   ├── auth.service.js
 │   ├── usuario.service.js
 │   ├── evento.service.js
 │   ├── categoria.service.js
 │   ├── inscripcion.service.js
 │   ├── notificacion.service.js
 │   ├── push.service.js
 │   └── dashboard.service.js
 ├── middlewares/
 │   ├── auth.middleware.js         # Verifica el JWT (viaja en cookie httpOnly)
 │   ├── role.middleware.js         # Restringe rutas por rol
 │   ├── validate.middleware.js     # Validación de datos de entrada
 │   ├── sanitize.middleware.js     # Prevención de XSS e inyecciones
 │   ├── rate-limit.middleware.js   # Límite de intentos (ej. login)
 │   ├── audit.middleware.js        # Registra acciones en la tabla Auditoria
 │   └── error-handler.middleware.js # Manejo centralizado de errores (incluye errores de Sequelize)
 ├── integrations/                  # APIs externas y envío de avisos
 │   ├── notificaciones.js          # Punto central de notificaciones: recibe un aviso
 │   │                              #   y lo reparte a varios canales; si un canal falla,
 │   │                              #   los demás siguen funcionando
 │   ├── channels/
 │   │   ├── in-app.channel.js      # Guarda la notificación en la tabla Notificaciones
 │   │   ├── email.channel.js       # Envío de correos (Resend)
 │   │   └── push.channel.js        # Notificaciones Web Push al navegador
 │   ├── eventos.hooks.js           # Avisos internos al publicar/cancelar un evento
 │   ├── register.js                # Conecta las integraciones al arrancar la app
 │   ├── telegram.service.js        # Anuncios al canal de Telegram
 │   ├── discord.service.js         # Anuncios al canal de Discord
 │   ├── email.service.js           # Cliente de correo
 │   ├── push.service.js            # Cliente Web Push (claves VAPID)
 │   └── templates/                 # Plantillas HTML de correo
 ├── jobs/
 │   └── recordatorios.job.js       # Tarea programada (cada 15 min): recuerda a los
 │                                  #   inscriptos confirmados los eventos publicados que
 │                                  #   empiezan en las próximas 24 h; marca cada evento en
 │                                  #   recordatorio_enviado_en para no avisar dos veces
 ├── utils/
 │   ├── jwt.util.js                # Firma y verificación de tokens
 │   ├── cookie.util.js             # Emisión de la cookie de sesión httpOnly
 │   ├── http-error.js              # Errores HTTP con código de estado
 │   └── usuario.util.js            # Ayudas comunes sobre usuarios
 ├── migrations/                    # Migraciones de Sequelize (creación y evolución del esquema)
 ├── seeders/                       # Datos de prueba (usuarios iniciales)
 ├── package.json
 └── app.js                        # Punto de entrada: Express, rutas, integraciones y job
```

---

## 3. Arquitectura de Frontend (Angular — Doble Vista)

Aplicación Angular con componentes standalone y ruteo con carga diferida por layout. El token de sesión no se guarda en el navegador: viaja en una cookie httpOnly que emite el backend, y el interceptor de credenciales adjunta esa cookie en cada petición a la API.

```text
proyfrontendgrupo02/src/app
 ├── core/                              # Servicios singleton, guards e interceptors
 │   ├── guards/
 │   │   ├── auth.guard.ts              # Exige sesión iniciada
 │   │   ├── guest.guard.ts             # Bloquea login/registro si ya hay sesión
 │   │   └── role.guard.ts              # Exige rol Organizador para la vista admin
 │   ├── interceptors/
 │   │   ├── credentials.interceptor.ts # Adjunta la cookie de sesión (withCredentials) a la API
 │   │   └── error.interceptor.ts       # Manejo global de errores HTTP y expiración de sesión
 │   ├── services/
 │   │   ├── api.service.ts             # Cliente HTTP base
 │   │   ├── auth.service.ts            # Sesión, login, registro, OAuth, 2FA
 │   │   ├── evento.service.ts
 │   │   ├── categoria.service.ts
 │   │   ├── inscripcion.service.ts
 │   │   ├── notificacion.service.ts
 │   │   ├── push.service.ts            # Suscripción Web Push del navegador
 │   │   ├── export.service.ts          # Exportación a PDF y Excel
 │   │   └── toast.service.ts           # Avisos en pantalla
 │   └── types/                         # Interfaces TypeScript compartidas
 ├── shared/
 │   └── components/
 │       ├── countdown/                 # Cuenta regresiva al inicio del evento
 │       └── toast-container/           # Contenedor de avisos
 ├── layouts/
 │   ├── public-layout/                 # Navbar y footer para la vista pública
 │   └── admin-layout/                  # Sidebar y header para el organizador
 ├── features/
 │   ├── auth/                          # Login, registro, retorno de OAuth Google, 2FA
 │   ├── public/                        # === VISTA ASISTENTE ===
 │   │   ├── home/
 │   │   ├── event-catalog/             # Catálogo con filtros y búsqueda
 │   │   └── event-detail/              # Detalle con cuenta regresiva e inscripción
 │   ├── user/
 │   │   └── perfil/                    # Perfil del usuario e historial
 │   └── admin/                         # === VISTA ORGANIZADOR ===
 │       ├── dashboard/                 # Métricas y gráficos
 │       ├── events/                    # Listado y formulario de eventos (CRUD)
 │       ├── categories/                # Listado y formulario de categorías (CRUD)
 │       └── attendees/                 # Lista de inscriptos por evento
 └── app.routes.ts                      # Ruteador con carga diferida por layout
```
