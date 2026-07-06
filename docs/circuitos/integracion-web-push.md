# Circuito: Integración Web Push (notificaciones del navegador + PWA)

**Responsable:** Gabriel Calisaya

## Qué hace

Permite que el usuario reciba notificaciones nativas del sistema operativo (inscripción confirmada, lista de espera, cupo liberado, evento cancelado/modificado, recordatorio 24 h antes) **aunque no tenga la pestaña de Convoca abierta**. Se apoya en el estándar Web Push: un service worker registrado en el navegador recibe los mensajes que el backend envía firmados con claves VAPID. Además, el `manifest.webmanifest` hace que Convoca sea instalable como PWA (aplicación de escritorio/celular).

## Flujo paso a paso

1. **El usuario hace clic en "Alertas del navegador"** — botón dentro del dropdown de notificaciones del navbar público (`public-layout.component.ts`, método `activarNotificacionesPush()`). Solo aparece si está logueado.
2. **El front obtiene la clave pública VAPID** — `PushService.obtenerClavePublica()` usa la de `environment.vapidPublicKey` o, como respaldo, la pide al backend con `GET /api/push/vapid-public-key` (endpoint sin login, solo devuelve la clave pública).
3. **Se registra el service worker** — `navigator.serviceWorker.register('/sw.js')`. Este archivo queda instalado en el navegador y vive independiente de la pestaña.
4. **El navegador pide permiso** — `Notification.requestPermission()`. Si el usuario no acepta ("granted"), el flujo se corta con un error claro.
5. **El navegador genera la suscripción** — `registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`. La clave VAPID pública se convierte a `Uint8Array` (formato que exige la API). El navegador devuelve un objeto con un `endpoint` (URL única del servicio push del navegador, ej. FCM en Chrome) y dos claves de cifrado (`p256dh` y `auth`).
6. **El front guarda la suscripción en el backend** — `POST /api/push/subscribe` (con JWT). `services/push.service.js` la persiste en la tabla `PushSubscriptions` asociada al `usuario_id`. Si el mismo `endpoint` ya existía, actualiza las keys (upsert manual). Un usuario puede tener varias suscripciones (PC + celular).
7. **El backend envía** — cuando pasa algo relevante (ej. una inscripción), el hub `integrations/notificaciones.js` llama al canal `push.channel.js`, que busca todas las suscripciones del usuario y envía cada una con `integrations/push.service.js`, que usa la librería `web-push` firmando con las claves VAPID (`webpush.sendNotification(subscription, payload)`).
8. **El service worker muestra la notificación** — el servicio push del navegador despierta a `sw.js`, que en el evento `push` hace `self.registration.showNotification(...)`. Esto funciona con la pestaña cerrada. Si el usuario hace clic en la notificación (`notificationclick`), se enfoca o abre la app.

## Archivos involucrados

**Backend (`proybackendgrupo02`):**

| Archivo | Rol |
|---|---|
| `routes/push.routes.js` | Define `GET /api/push/vapid-public-key` (público) y `POST /api/push/subscribe` (con JWT + validación de `endpoint` y `keys`). |
| `controllers/push.controller.js` | `clavePublica()` devuelve la clave pública (503 si no está configurada); `subscribe()` delega en el servicio. |
| `services/push.service.js` | Lógica de negocio: valida y guarda/actualiza la suscripción por usuario. |
| `integrations/push.service.js` | Wrapper de la librería `web-push`: configura VAPID una sola vez (`asegurarVapid()`) y expone `enviarPush(subscription, payload)`. |
| `integrations/channels/push.channel.js` | Canal push del hub de notificaciones: por cada evento del sistema arma título/cuerpo y envía a todas las suscripciones del usuario. Si una devuelve 410, la borra. |
| `integrations/notificaciones.js` | Hub: los servicios (ej. inscripciones) llaman acá y el hub reparte a los canales in-app, email y push sin que se conozcan entre sí. |
| `models/push-subscription.model.js` | Modelo Sequelize `PushSubscription`: `usuario_id`, `endpoint` (TEXT, unique), `keys` (JSONB). Relación `belongsTo Usuario`. |

**Variables de entorno (backend `.env`):**

| Variable | Para qué sirve |
|---|---|
| `VAPID_PUBLIC_KEY` | Clave pública VAPID. Se comparte con el navegador al suscribirse. |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID. Solo vive en el servidor; firma cada envío. |
| `VAPID_SUBJECT` | Identificación del emisor (ej. `mailto:convoca@unju.edu.ar`). Si falta, se usa ese valor por defecto. |

Si faltan las claves, el push queda deshabilitado con un warning (no rompe la app).

**Frontend (`proyfrontendgrupo02`):**

| Archivo | Rol |
|---|---|
| `src/app/core/services/push.service.ts` | Orquesta todo el lado cliente: compatibilidad, registro del SW, permiso, suscripción y POST al backend. |
| `public/sw.js` | Service worker: escucha `push` (muestra la notificación) y `notificationclick` (abre/enfoca la app). |
| `public/manifest.webmanifest` | Manifiesto PWA: nombre "Convoca", `display: standalone`, ícono; hace la app instalable. |
| `src/app/layouts/public-layout/public-layout.component.ts` | Botón "Alertas del navegador" dentro del dropdown de la campana; maneja el spinner (`activandoPush`) y los toasts de éxito/error. |

## Puntos clave para la defensa

1. **Por qué existen dos `push.service.js` en el backend:** `services/push.service.js` es lógica de negocio (guardar suscripciones en la BD); `integrations/push.service.js` es un wrapper de la librería externa `web-push` (solo envía). Es la misma separación que se usa con Resend para email.
2. **Qué es VAPID:** un par de claves que identifica a nuestro servidor ante los servicios push de los navegadores (Google, Mozilla, etc.). La pública viaja al navegador al suscribirse; la privada firma cada envío. Así solo nuestro backend puede mandarle mensajes a esa suscripción. Se configuran una sola vez con `webpush.setVapidDetails()` en `asegurarVapid()` (`integrations/push.service.js`).
3. **Qué guarda la suscripción:** no un token cualquiera, sino un `endpoint` (URL del servicio push del navegador) y las claves `p256dh`/`auth` con las que se cifra el payload de extremo a extremo. Se persiste en `PushSubscriptions` con `endpoint` único; si el navegador re-suscribe, se actualiza (`guardarSuscripcion()` en `services/push.service.js`).
4. **Por qué llega con la pestaña cerrada:** el mensaje no va a la página, va al service worker (`public/sw.js`), que el navegador despierta cuando el servicio push recibe algo. `event.waitUntil(showNotification(...))` garantiza que el SW no se duerma antes de mostrarla.
5. **Limpieza de suscripciones muertas:** si el envío devuelve HTTP 410 (usuario revocó el permiso o desinstaló), el canal borra el registro (`enviarATodasDelUsuario()` en `push.channel.js`). No acumulamos basura ni reintentamos a endpoints inválidos.
6. **Desacoplamiento vía hub:** `inscripcion.service.js` nunca llama al push directamente; llama a `notificaciones.inscripcionConfirmada(usuario, evento)` y el hub (`integrations/notificaciones.js`) reparte a in-app, email y push, aislando errores por canal.
7. **Seguridad:** obtener la clave pública no requiere login, pero guardar la suscripción sí (`authMiddleware` en `push.routes.js`), porque hay que asociarla a `req.usuario.id`. Además `express-validator` exige `endpoint`, `keys.p256dh` y `keys.auth`.
8. **PWA:** `manifest.webmanifest` con `display: standalone` + service worker registrado = Chrome ofrece "Instalar Convoca". La app instalada usa el mismo SW, así que las notificaciones también funcionan instalada.

## Bloques de código clave

**1. Suscripción en el front — pedir permiso y suscribirse (`src/app/core/services/push.service.ts`)**

```typescript
// 1) Registrar el service worker (queda vivo aunque se cierre la pestaña)
const registro = await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;

// 2) Pedir permiso al usuario (diálogo nativo del navegador)
const permiso = await Notification.requestPermission();
if (permiso !== 'granted') {
  throw new Error('Necesitamos tu permiso para enviarte alertas.');
}

// 3) El navegador genera la suscripción usando nuestra clave pública VAPID
const suscripcion = await registro.pushManager.subscribe({
  userVisibleOnly: true, // obligatorio: todo push debe mostrar algo visible
  applicationServerKey: this.convertirClaveVapid(clavePublica),
});

// 4) Se la mandamos al backend para que la guarde asociada al usuario (JWT)
await firstValueFrom(this.http.post(`${this.apiUrl}/subscribe`, suscripcion.toJSON()));
```

**2. Envío en el backend con claves VAPID (`integrations/push.service.js`)**

```javascript
function asegurarVapid() {
  if (vapidConfigurado) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:convoca@unju.edu.ar';

  if (!publicKey || !privateKey) {
    // Sin claves, el push queda deshabilitado pero la app sigue funcionando
    console.warn('[push] Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en .env — push deshabilitado.');
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey); // firma los envíos
  vapidConfigurado = true;
  return true;
}

async function enviarPush(subscription, payload) {
  if (!asegurarVapid()) return;
  const cuerpo = JSON.stringify({
    title: payload.title || 'Convoca',
    body: payload.body || '',
    url: payload.url || '/',
  });
  // La librería cifra el cuerpo con las keys p256dh/auth de la suscripción
  await webpush.sendNotification(subscription, cuerpo);
}
```

**3. Canal push del hub — envío a todas las suscripciones del usuario (`integrations/channels/push.channel.js`)**

```javascript
async function enviarATodasDelUsuario(usuario, titulo, cuerpo) {
  // Un usuario puede tener varias suscripciones (Chrome en PC + celular)
  const suscripciones = await PushSubscription.findAll({
    where: { usuario_id: usuario.id },
  });

  for (const registro of suscripciones) {
    const subscription = { endpoint: registro.endpoint, keys: registro.keys };
    try {
      await enviarPush(subscription, { title: titulo, body: cuerpo });
    } catch (err) {
      // 410 = la suscripción expiró (el usuario revocó el permiso): la borramos
      if (err.statusCode === 410) {
        await registro.destroy();
      }
    }
  }
}
```

**4. Service worker — la notificación llega con la pestaña cerrada (`public/sw.js`)**

```javascript
// El navegador despierta este archivo cuando llega un push del servidor,
// incluso si no hay ninguna pestaña de Convoca abierta.
self.addEventListener('push', (event) => {
  let datos = { title: 'Convoca', body: 'Tenés una novedad en Convoca', url: '/' };
  if (event.data) {
    datos = { ...datos, ...event.data.json() }; // payload que armó el backend
  }
  // waitUntil evita que el SW se duerma antes de mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: '/favicon.png',
      data: { url: datos.url || '/' },
    })
  );
});
```
