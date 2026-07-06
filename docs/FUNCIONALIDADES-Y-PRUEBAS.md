# Funcionalidades y cómo probarlas

Guía para demo o defensa: qué hace el sistema y cómo verificar cada funcionalidad, desde la interfaz y por API. El detalle interno de cada circuito (flujo, archivos, decisiones) está en [`docs/circuitos/`](./circuitos/README.md); acá solo está lo necesario para probar.

## 1. Dejar el sistema corriendo

Pasos completos en [`docs/SETUP.md`](./SETUP.md). Resumen:

1. Backend (`proybackendgrupo02`):
   ```bash
   npm install
   cp .env.example .env    # completar al menos DATABASE_URL y JWT_SECRET
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all   # carga usuarios de prueba
   npm run dev             # o npm start
   ```
   Queda en `http://localhost:3000`. Verificación rápida: `GET http://localhost:3000/api/health` debe responder `status: ok` y `database: up`.
2. Frontend (`proyfrontendgrupo02`):
   ```bash
   npm install
   npm start               # equivale a ng serve
   ```
   Queda en `http://localhost:4200`.

Sobre el `.env`: con `DATABASE_URL` y `JWT_SECRET` alcanza para probar todo el núcleo (auth, eventos, inscripciones, notificaciones in-app, dashboard). Las integraciones reales necesitan variables extra (`RESEND_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `TELEGRAM_BOT_TOKEN/CHANNEL_ID`, `DISCORD_BOT_TOKEN/CHANNEL_ID`, `VAPID_PUBLIC/PRIVATE_KEY`). Si faltan, esas partes quedan desactivadas o simuladas — el detalle está en la sección 4.

Para probar por API sin frontend: el login devuelve el token en el body, se puede usar como `Authorization: Bearer <token>` en Postman/Thunder Client. Desde el navegador la sesión va por cookie httpOnly.

## 2. Credenciales de prueba (seeder)

El seeder `seeders/20260704000001-usuarios-prueba.js` crea:

| Usuario | Password | Rol | Qué puede hacer |
|---|---|---|---|
| `admin` (admin@convoca.app) | `admin123` | ORGANIZADOR | Todo: panel `/admin`, ABM de eventos y categorías, lista de inscriptos, check-in manual, dashboard. Además puede inscribirse a eventos como cualquier usuario. |
| `laura` (laura@demo.com) | `user1234` | ASISTENTE | Ver catálogo, inscribirse, cancelar, ver su pase QR, recibir notificaciones. No accede a `/admin`. |
| `carlos`, `vale`, `martin`, `sofia` (…@demo.com) | `user1234` | ASISTENTE | Ídem. Sirven para llenar cupos y probar la lista de espera con varios usuarios. |

El login acepta username o email indistintamente en el campo de usuario.

## 3. Funcionalidades

### 3.1 Autenticación y usuarios

Detalle interno: [`circuitos/autenticacion.md`](./circuitos/autenticacion.md).

**Registro de usuario**
- Qué hace: crea una cuenta local con rol ASISTENTE (el rol que se mande en el body se ignora a propósito).
- Cómo probar: en `http://localhost:4200/registro`, completar nombre, username, email y password (mínimo 8 caracteres) y enviar. Por API: `POST /api/auth/registro`.
- Qué se espera: queda logueado directo (cookie de sesión) y redirigido como asistente. Un email o username repetido da error de validación.

**Login con usuario y contraseña**
- Qué hace: valida credenciales y emite JWT (cookie httpOnly + token en el body).
- Cómo probar: en `/login`, entrar con `admin` / `admin123` o `laura` / `user1234`. Por API: `POST /api/auth/login` con `{ "username": "admin", "password": "admin123" }`.
- Qué se espera: con organizador aparece el acceso al panel de administración; con asistente no. Hay rate limit en login: muchos intentos fallidos seguidos devuelven 429.

**Login con Google (OAuth 2.0)**
- Qué hace: autentica contra Google; si ya existe un usuario con ese email, vincula la cuenta en vez de duplicarla.
- Cómo probar: botón "Continuar con Google" en `/login` (arranca en `GET /api/auth/google`, vuelve por `/api/auth/google/callback`).
- Qué se espera: pantalla de consentimiento de Google y vuelta a la app ya logueado. Requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`; sin ellas el flujo falla al redirigir a Google.

**Verificación en dos pasos (2FA por email)**
- Qué hace: si está activado, el login no entrega token; manda un código de 6 dígitos al email (un solo uso, guardado hasheado) y pide validarlo.
- Cómo probar: logueado, ir a `/perfil` y activar el switch "Doble factor por email (2FA)" (`POST /api/auth/2fa/config`). Cerrar sesión y volver a loguear: la app lleva a la pantalla de código (`/auth/2fa`). Ingresar el código recibido (`POST /api/auth/2fa/verify`).
- Qué se espera: con el código correcto entra; con uno incorrecto o vencido, 401. También aplica al login con Google si la cuenta tiene 2FA.
- Ojo para la demo: el código viaja por email real vía Resend. Sin `RESEND_API_KEY` el envío se simula por consola: el backend imprime el cuerpo del correo (incluido el código de 6 dígitos), así que en desarrollo se lee en la terminal del backend y se completa el login igual.

**Perfil**
- Qué hace: ver los datos de la cuenta y cambiar el nombre visible.
- Cómo probar: en `/perfil`, editar el nombre y guardar. Por API: `GET /api/auth/perfil` y `PUT /api/auth/perfil` con `{ "nombre": "Nuevo Nombre" }`.
- Qué se espera: el nombre se actualiza y se refleja en el navbar.

**Logout**
- Qué hace: borra la cookie httpOnly de sesión (`POST /api/auth/logout`).
- Cómo probar: menú de usuario en el navbar, "Cerrar sesión".
- Qué se espera: vuelve al estado público; las rutas protegidas (`/perfil`, `/admin`) redirigen a login.

**CRUD de usuarios (solo API)**
- Qué hace: alta, baja, modificación y listado de usuarios, incluyendo cambio de rol (`ORGANIZADOR`/`ASISTENTE`).
- Cómo probar: con un token válido, `GET/POST /api/usuarios`, `GET/PUT/DELETE /api/usuarios/:id`. No tiene pantalla propia en el frontend.

### 3.2 Eventos y catálogo

Detalle interno: [`circuitos/eventos-e-inscripciones.md`](./circuitos/eventos-e-inscripciones.md).

**Catálogo público de eventos**
- Qué hace: lista los eventos PUBLICADO y CANCELADO (los BORRADOR no se muestran), con sus categorías y cupos.
- Cómo probar: entrar sin login a `http://localhost:4200` (home) o `/eventos`. Por API: `GET /api/eventos`, con filtros `?categoria=<nombre>`, `?search=<texto>` (busca en el título) y `?todos=true` para incluir borradores (lo usa el panel admin).
- Qué se espera: tarjetas de eventos ordenadas por fecha; los cancelados se distinguen visualmente.

**Buscador con sugerencias**
- Qué hace: busca eventos por título desde el navbar.
- Cómo probar: tipear 3 o más letras en el buscador de la barra superior.
- Qué se espera: dropdown con sugerencias; al hacer click va al detalle del evento.

**Detalle de evento**
- Qué hace: muestra un evento con descripción, fecha, lugar, cupo y estado de inscripción del usuario.
- Cómo probar: click en cualquier tarjeta del catálogo. Por API: `GET /api/eventos/:id`.
- Qué se espera: la página `/eventos/:id` con el botón de inscripción según el estado (inscribirse, cancelar, evento cancelado, etc.).

**ABM de eventos (organizador)**
- Qué hace: crear, editar y eliminar eventos con estados BORRADOR / PUBLICADO / CANCELADO.
- Cómo probar: como `admin`, ir a `/admin/eventos` → "Crear evento" (o editar uno existente). Por API: `POST /api/eventos`, `PUT /api/eventos/:id`, `DELETE /api/eventos/:id` (todas con rol ORGANIZADOR).
- Qué se espera: validaciones activas — fecha en el futuro, cupo mínimo 1, título y ubicación obligatorios. Un BORRADOR no aparece en el catálogo público hasta publicarlo. No deja reducir el cupo por debajo de las inscripciones ya confirmadas (400 con mensaje explicando cuántas hay). Publicar un evento dispara la difusión por Telegram y Discord (sección 3.5).

**Cancelación de evento con aviso a inscriptos**
- Qué hace: al pasar un evento a CANCELADO, da de baja todas sus inscripciones activas y avisa a cada inscripto (notificación in-app + email).
- Cómo probar: con un evento publicado que tenga inscriptos, editarlo en `/admin/eventos` y cambiar el estado a CANCELADO.
- Qué se espera: los inscriptos ven su inscripción como cancelada en `/mis-inscripciones` y les llega una notificación en la campana. Si Telegram está configurado, también se anuncia la cancelación en el canal.

**Aviso por cambio de fecha o lugar**
- Qué hace: si se edita la fecha o la ubicación de un evento PUBLICADO, se notifica a los inscriptos activos.
- Cómo probar: editar la fecha o el lugar de un evento publicado con inscriptos.
- Qué se espera: notificación in-app (y email) a cada inscripto indicando el cambio.

**ABM de categorías (organizador)**
- Qué hace: administrar las categorías con las que se etiquetan los eventos.
- Cómo probar: como `admin`, `/admin/categorias` → crear, editar o eliminar. Por API: `GET /api/categorias` (público), `POST/PUT/DELETE /api/categorias/:id` (ORGANIZADOR).
- Qué se espera: la categoría nueva aparece disponible al crear/editar eventos y como filtro del catálogo.

### 3.3 Inscripciones y check-in

Detalle interno: [`circuitos/eventos-e-inscripciones.md`](./circuitos/eventos-e-inscripciones.md).

**Inscribirse a un evento**
- Qué hace: registra al usuario logueado en un evento publicado, con control de cupo dentro de una transacción con bloqueo de fila (no hay sobreventa con inscripciones concurrentes).
- Cómo probar: como `laura`, entrar al detalle de un evento publicado y click en "Inscribirme al evento". Por API: `POST /api/inscripciones` con `{ "eventoId": "<uuid>" }`.
- Qué se espera: si hay cupo, estado CONFIRMADO; si el cupo está lleno, ESPERA. Llega notificación in-app y email de confirmación. Inscribirse dos veces da 400; a un evento cancelado o pasado, 409; a un borrador, 404.

**Lista de espera y promoción automática**
- Qué hace: cuando un confirmado cancela, el primero de la lista de espera pasa a CONFIRMADO automáticamente y se le avisa.
- Cómo probar (guion de demo):
  1. Como `admin`, crear y publicar un evento con `cupo_maximo: 1`.
  2. Como `laura`, inscribirse → queda CONFIRMADO.
  3. Como `carlos`, inscribirse → queda EN ESPERA.
  4. Como `laura`, cancelar la inscripción (desde el detalle del evento o `/mis-inscripciones`).
- Qué se espera: `carlos` pasa a CONFIRMADO sin hacer nada y recibe la notificación "se liberó un cupo" con el nombre del evento.

**Cancelar inscripción**
- Qué hace: pasa la inscripción a CANCELADO. `DELETE /api/inscripciones/:eventoId`.
- Cómo probar: botón "Cancelar inscripción" en el detalle del evento, o el ícono de basura en `/mis-inscripciones` (solo aparece para eventos futuros).
- Qué se espera: la inscripción queda cancelada; se puede volver a inscribir después (reutiliza el registro con un QR nuevo).

**Mis inscripciones**
- Qué hace: historial del usuario con el estado de cada inscripción y datos del evento. `GET /api/inscripciones/mis-inscripciones`.
- Cómo probar: logueado, menú de usuario → "Mis inscripciones" (`/mis-inscripciones`).
- Qué se espera: tarjetas con badges Confirmado / En Espera / Asistió / Cancelado, ordenadas por fecha del evento.

**Pase de acceso con QR y descarga en PDF**
- Qué hace: genera el pase del evento con un código QR (codifica el `qr_token` único de la inscripción) y permite bajarlo en PDF.
- Cómo probar: en `/mis-inscripciones`, en una inscripción CONFIRMADO, click en "Ver Pase". En el modal, "Descargar PDF".
- Qué se espera: modal con el QR y los datos del evento; el PDF se descarga con el mismo contenido.

**Check-in por QR**
- Qué hace: marca la asistencia (estado ASISTIO) a partir del token del QR. `POST /api/inscripciones/check-in` con `{ "qr_token": "<uuid>" }` (requiere estar logueado).
- Cómo probar: escanear el QR del pase con el celular para obtener el token (el QR es el token en texto plano) y mandarlo por API, o copiarlo directo de la base/respuesta de inscripción. No hay pantalla de escáner en la app; en la demo el camino visual es el check-in manual (siguiente punto).
- Qué se espera: primera vez, la inscripción pasa a ASISTIO. Segunda vez, 400 "ya fue registrada". Con una inscripción EN ESPERA o CANCELADO, 400. Token inválido, 404.

**Lista de inscriptos y check-in manual (organizador)**
- Qué hace: muestra los inscriptos de un evento con filtros y estadísticas, y permite marcar asistencia sin QR (queda registrado en auditoría).
- Cómo probar: como `admin`, `/admin/eventos` → botón de inscriptos de un evento (`/admin/eventos/:id/inscriptos`). Filtrar por estado o buscar por nombre/email, y usar el botón de check-in de una fila. Por API: `GET /api/inscripciones/evento/:eventoId?estado=CONFIRMADO&search=laura&page=1&limit=10` y `POST /api/inscripciones/:id/check-in-manual`.
- Qué se espera: contadores por estado (confirmados, en espera, asistieron, cancelados) y la fila pasa a Asistió al hacer el check-in.

**Exportar inscriptos a Excel**
- Qué hace: descarga el listado de inscriptos del evento como `.xlsx` (se genera en el frontend).
- Cómo probar: en la pantalla de inscriptos, botón de exportar.
- Qué se espera: se descarga un Excel con los inscriptos; sin inscriptos avisa que no hay datos.

### 3.4 Notificaciones

Detalle interno: [`circuitos/notificaciones.md`](./circuitos/notificaciones.md) y [`circuitos/integracion-web-push.md`](./circuitos/integracion-web-push.md). Todas las notificaciones salen de un hub central que las manda por tres canales a la vez: in-app (siempre), email (si hay Resend) y web push (si hay VAPID y el usuario se suscribió). Un canal que falla no afecta a los demás.

**Notificaciones in-app (campana)**
- Qué hace: registro persistente de avisos por usuario: inscripción confirmada, en espera, cupo liberado, evento cancelado/modificado, recordatorio.
- Cómo probar: inscribirse a un evento y abrir la campana del navbar. El contador de no leídas se refresca solo cada 30 segundos. Por API: `GET /api/notificaciones`, `PUT /api/notificaciones/:id/leida`, `PUT /api/notificaciones/leer-todas`.
- Qué se espera: la notificación nueva aparece con badge de no leída; al marcarla (o "marcar todas") el contador baja.

**Emails**
- Qué hace: manda por correo los mismos avisos (confirmación, cupo liberado, cancelación, recordatorio) y el código 2FA, vía Resend.
- Cómo probar: con `RESEND_API_KEY` configurada, inscribirse a un evento y revisar la casilla.
- Qué se espera: llega el email. Sin la API key, el backend loguea `[Simulado] Enviando correo a: ...` junto con el asunto y el cuerpo del correo, y no envía nada — para la demo sin key, mostrar ese log en la terminal del backend (ahí se lee, por ejemplo, el código 2FA). Con Resend en modo prueba (remitente `onboarding@resend.dev`) solo entrega a la casilla del dueño de la cuenta de Resend.

**Notificaciones push del navegador**
- Qué hace: manda los avisos como notificaciones nativas del navegador aunque la pestaña esté cerrada (service worker + protocolo Web Push).
- Cómo probar: requiere `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en el `.env` (se generan con `npx web-push generate-vapid-keys`). Logueado, abrir la campana y usar el botón de activar alertas del navegador; aceptar el permiso. Después, generar un aviso (por ejemplo, que otro usuario cancele y te libere un cupo). Endpoints: `GET /api/push/vapid-public-key` y `POST /api/push/subscribe`.
- Qué se espera: notificación del sistema operativo. Sin claves VAPID el backend responde que push está deshabilitado y el botón muestra el error.

**Recordatorio 24 horas antes del evento**
- Qué hace: un cron corre cada 15 minutos y avisa (in-app, email, push) a los CONFIRMADO de eventos publicados que empiezan dentro de las próximas 24 horas. Se manda una sola vez por evento (columna `recordatorio_enviado_en`).
- Cómo probar: crear y publicar un evento con fecha dentro de las próximas 24 horas, inscribirse, y esperar la próxima corrida del cron (hasta 15 minutos con el backend corriendo).
- Qué se espera: llega el recordatorio una única vez; corridas siguientes no lo repiten.

### 3.5 Integraciones externas

**Difusión en Telegram**
- Qué hace: al publicar un evento, el bot postea el anuncio (título, fecha, cupo, link al detalle) en un canal fijo; al cancelar, postea el aviso de cancelación. Detalle: [`circuitos/integracion-telegram.md`](./circuitos/integracion-telegram.md).
- Cómo probar: con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHANNEL_ID` en el `.env`, crear un evento como BORRADOR y editarlo a PUBLICADO (o crearlo ya publicado). Después, cancelarlo.
- Qué se espera: mensaje en el canal de Telegram en cada transición. Sin las variables, la integración queda desactivada sin romper nada (publicar funciona igual). En localhost el link va como texto porque Telegram rechaza URLs no públicas en botones.

**Difusión en Discord**
- Qué hace: al publicar un evento, el bot manda el anuncio a un canal del servidor. Detalle: [`circuitos/integracion-discord.md`](./circuitos/integracion-discord.md).
- Cómo probar: con `DISCORD_BOT_TOKEN` y `DISCORD_CHANNEL_ID`, publicar un evento.
- Qué se espera: mensaje en el canal de Discord. Sin el token, el bot no se conecta y la difusión queda desactivada.

**Agregar a Google Calendar**
- Qué hace: arma un link a Google Calendar con el evento precargado (título, fecha con 2 horas de duración, descripción y lugar). Es todo del lado del cliente: no necesita ninguna variable de entorno. Detalle: [`circuitos/integracion-google-calendar.md`](./circuitos/integracion-google-calendar.md).
- Cómo probar: en el detalle de un evento, botón "Agregar a Google Calendar".
- Qué se espera: se abre calendar.google.com con el formulario de evento completo, listo para guardar.

### 3.6 Dashboard administrativo

Detalle interno: [`circuitos/dashboard.md`](./circuitos/dashboard.md).

**KPIs y gráficos**
- Qué hace: métricas globales (total de usuarios, eventos publicados, inscripciones activas, promedio de valoraciones) y gráficos: inscripciones por mes (últimos 6 meses), distribución de inscripciones por estado y eventos por estado.
- Cómo probar: como `admin`, ir a `/admin` (redirige a `/admin/dashboard`). Por API: `GET /api/dashboard/kpis` y `GET /api/dashboard/charts`.
- Qué se espera: tarjetas de KPIs y gráficos con datos reales. Un ASISTENTE no puede entrar: el guard del frontend lo saca de `/admin` y la API devuelve 403.

### 3.7 Salud del sistema

**Health check**
- Qué hace: estado del servidor y de la conexión a la base. `GET /api/health` (sin autenticación).
- Qué se espera: `{ "status": "ok", "database": "up", ... }`. Sirve como primer paso de la demo para mostrar que backend y base responden.

## 4. Qué pasa si falta configuración externa

| Variable(s) | Funcionalidad afectada | Comportamiento sin configurar |
|---|---|---|
| `RESEND_API_KEY` | Emails y código 2FA | Envío simulado: el backend loguea el correo completo (asunto y cuerpo, incluido el código 2FA) en su consola y no envía nada. El 2FA se puede completar leyendo el código en la terminal. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google | El flujo OAuth falla al redirigir; el login local sigue funcionando. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHANNEL_ID` | Difusión en Telegram | Desactivada. Publicar y cancelar eventos funciona igual. |
| `DISCORD_BOT_TOKEN` / `DISCORD_CHANNEL_ID` | Difusión en Discord | El bot no se conecta; desactivada. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push del navegador | Push deshabilitado (warning en consola); el botón de activar alertas devuelve error. In-app y email siguen andando. |

El resto del sistema (autenticación local, eventos, inscripciones, check-in, notificaciones in-app, dashboard) no depende de ningún servicio externo más que la base de datos.
