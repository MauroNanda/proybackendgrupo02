# Circuito: Notificaciones (multicanal + recordatorio 24 h)

**Responsable:** circuito transversal. El recordatorio 24 h y los avisos de evento cancelado/modificado son de **Mauro**; los canales base (in-app, email, push) y el hub son trabajo del **equipo**.

## Qué hace

Centraliza el envío de avisos al usuario en un único punto (el "hub" `integrations/notificaciones.js`) que reparte cada aviso a tres canales: **in-app** (campana, se guarda en la BD), **email** (Resend) y **web push** (navegador). Los servicios de negocio (inscripciones, eventos) no conocen los canales: solo llaman al hub. Además, una tarea programada (cron) recuerda a los inscriptos confirmados que su evento empieza dentro de las próximas 24 horas.

## Eventos que disparan notificación

| Disparador | Quién lo dispara | Método del hub | Canales que lo atienden |
|---|---|---|---|
| Inscripción confirmada | `inscripcion.service.js` → `inscribirse()` | `inscripcionConfirmada` | in-app, email, push |
| Quedó en lista de espera | `inscripcion.service.js` → `inscribirse()` | `inscripcionEnEspera` | in-app, push (**sin email**) |
| Se liberó un cupo (promoción desde espera) | `inscripcion.service.js` → `cancelar()` | `cupoLiberado` | in-app, email, push |
| Evento cancelado | `evento.service.js` → `actualizar()` | `eventoCancelado` | in-app, email, push |
| Evento modificado (fecha/lugar) | `evento.service.js` → `actualizar()` | `eventoModificado` | in-app, email, push |
| Recordatorio 24 h antes | `jobs/recordatorios.job.js` (cron) | `recordatorioEvento` | in-app, push (**sin email**) |

## Flujo paso a paso

### (a) Un aviso normal: inscripción confirmada

1. El usuario se inscribe a un evento (`POST` de inscripción). `inscripcion.service.js → inscribirse()` valida el cupo **dentro de una transacción** con bloqueo de fila y crea la inscripción con estado `CONFIRMADO` o `ESPERA`.
2. **Fuera de la transacción** (la notificación es un efecto secundario: si falla, la inscripción ya quedó hecha), el servicio busca al usuario y llama al hub: `notificaciones.inscripcionConfirmada(usuario, evento)` (o `inscripcionEnEspera` si quedó en espera).
3. El hub (`integrations/notificaciones.js → emitir()`) recorre el array `canales = [inApp, email, push]` y en cada canal:
   - si el canal **no implementa** ese método, lo saltea (`continue`);
   - si lo implementa, lo ejecuta dentro de un `try/catch`: si un canal tira error, se loguea y **se sigue con el siguiente canal**.
4. Qué hace cada canal:
   - **in-app** (`channels/in-app.channel.js`): crea una fila en la tabla `Notificaciones` (`Notificacion.create` con `usuario_id`, `titulo`, `mensaje`, `tipo: 'INSCRIPCION'`, `leida: false`). El frontend la muestra en la campana.
   - **email** (`channels/email.channel.js`): manda un mail vía `email.service.js` (Resend) usando la plantilla HTML `inscripcion-confirmada.html`. Si el usuario no tiene email, retorna sin hacer nada.
   - **push** (`channels/push.channel.js`): busca **todas** las suscripciones del usuario en `PushSubscriptions` (puede tener varias: PC y celular) y envía una notificación de navegador a cada una vía `push.service.js`. Si el endpoint devuelve `410 Gone` (el usuario revocó el permiso), borra esa suscripción de la BD.
5. El usuario recibe el aviso por la campana, por mail y por el navegador.

### (b) El recordatorio 24 h

1. Al arrancar el servidor, `app.js` llama a `recordatoriosJob.iniciar()` **después** de conectar la BD.
2. `node-cron` ejecuta la función cada **15 minutos** (`'*/15 * * * *'`). Un flag `corriendo` evita corridas superpuestas si una tarda más de 15'.
3. Cada corrida busca eventos con `estado: 'PUBLICADO'`, `recordatorio_enviado_en: null` y `fecha` entre ahora y ahora + 24 h.
4. Por cada evento hace un **claim atómico**: `UPDATE Eventos SET recordatorio_enviado_en = ahora WHERE id = X AND recordatorio_enviado_en IS NULL`. Si afectó 0 filas, otra corrida/instancia ya lo tomó y se saltea. Así el recordatorio **nunca sale dos veces**.
5. Busca las inscripciones `CONFIRMADO` de ese evento (con su usuario) y por cada una llama a `notificaciones.recordatorioEvento(usuario, evento)`, con `try/catch` por usuario: si falla el aviso a uno, se sigue con el resto.
6. El hub reparte a in-app y push (email no implementa `recordatorioEvento`, así que se omite).

### (b') Avisos de evento cancelado / modificado

En `evento.service.js → actualizar()`: si el evento pasa a `CANCELADO`, se capturan los inscriptos activos **antes** de darlos de baja (después del bulk update ya quedan `CANCELADO` y no se pueden distinguir) y a cada uno se le manda `eventoCancelado`. Si el evento sigue `PUBLICADO` pero cambió la **fecha** o la **ubicación** (se compara contra un snapshot tomado antes del `update`), a cada inscripto activo se le manda `eventoModificado` con el detalle de qué cambió (`cambios = { fecha, ubicacion }`).

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `integrations/notificaciones.js` | Hub central: recibe el aviso del servicio y lo reparte a los canales, aislando errores. |
| `integrations/channels/in-app.channel.js` | Canal campana: persiste la notificación en la tabla `Notificaciones`. Implementa los 6 avisos. |
| `integrations/channels/email.channel.js` | Canal email (Resend): implementa solo 4 avisos (no espera, no recordatorio). |
| `integrations/channels/push.channel.js` | Canal Web Push: envía a todas las suscripciones del usuario; limpia las expiradas (410). |
| `services/inscripcion.service.js` | Dispara `inscripcionConfirmada` / `inscripcionEnEspera` al inscribirse y `cupoLiberado` al promover desde la lista de espera. |
| `services/evento.service.js` | Dispara `eventoCancelado` y `eventoModificado` (fecha/lugar) al editar un evento. |
| `jobs/recordatorios.job.js` | Cron cada 15': busca eventos que empiezan en menos de 24 h y dispara `recordatorioEvento` a los confirmados. |
| `app.js` | Enganche del job: `recordatoriosJob.iniciar()` tras conectar la BD. |
| `models/evento.model.js` | Columna `recordatorio_enviado_en` (marca anti-duplicado del recordatorio). |
| `models/notificacion.model.js` | Tabla de notificaciones in-app (`titulo`, `mensaje`, `leida`, `tipo` como ENUM). |
| `models/push-subscription.model.js` | Suscripciones push por usuario (`endpoint` único + `keys` JSONB); un usuario puede tener varias. |
| `integrations/email.service.js` / `push.service.js` | Clientes de bajo nivel (Resend / web-push) que usan los canales. |

## Puntos clave para la defensa

1. **Punto central que reparte (patrón hub / publish-subscribe simple).** Los servicios llaman a un único módulo (`notificaciones.js`) y no saben qué canales existen. Agregar un canal nuevo (ej. Telegram) es crear `channels/<nombre>.channel.js` y sumarlo al array `canales` (o `registrarCanal()`), **sin tocar los servicios**. Referencia: `integrations/notificaciones.js`, función `emitir()`.

2. **Aislamiento de errores en dos niveles.** (a) Por canal: `emitir()` envuelve cada canal en `try/catch`; si Resend está caído, la notificación in-app y el push salen igual. (b) Por operación: los servicios llaman al hub *fuera* de la transacción y también en `try/catch`, así una falla de notificación jamás rompe la inscripción o la edición del evento. Referencias: `notificaciones.js → emitir()`, `inscripcion.service.js → inscribirse()` (comentario "fuera de la transacción"), `evento.service.js → actualizar()`.

3. **No todo va por email — es una decisión, no una falta.** El canal email simplemente **no implementa** `inscripcionEnEspera` ni `recordatorioEvento`; el hub, al ver que el método no existe (`typeof canal[metodo] !== 'function'`), lo saltea. Criterio: el email se reserva para avisos importantes/accionables (confirmación, cupo liberado, cancelación, cambio de fecha/lugar); quedar en espera o un recordatorio son avisos livianos que van por campana y push, para no spamear la casilla. Referencia: `channels/email.channel.js` (comentario al inicio) + `notificaciones.js` línea del `continue`.

4. **Recordatorio sin duplicados (idempotencia).** La columna `Eventos.recordatorio_enviado_en` arranca en `NULL`. Antes de enviar, el job hace un `UPDATE` condicional (`WHERE recordatorio_enviado_en IS NULL`): es atómico en PostgreSQL, así que aunque corran dos instancias del servidor o dos corridas se pisen, solo una "gana" el evento. Referencia: `jobs/recordatorios.job.js → enviarRecordatorios()`.

5. **Ventana ancha con recuperación.** El job busca eventos que empiezan en `[ahora, ahora + 24 h]` (no una franja angosta de 15'): si el servidor estuvo caído y se perdió una corrida, el evento se recupera en la siguiente — el aviso sale tarde, pero sale. Referencia: comentario de cabecera de `jobs/recordatorios.job.js`.

6. **El job no tumba el servidor.** La corrida entera está en `try/catch` (se reintenta en 15'), hay flag `corriendo` contra corridas superpuestas e `iniciar()` es idempotente (no duplica el cron si se llama dos veces). Referencia: `jobs/recordatorios.job.js → iniciar()`.

## Bloques de código clave

### 1. El hub que reparte a los canales (`integrations/notificaciones.js`)

```javascript
const canales = [inApp, email, push];

async function emitir(metodo, usuario, evento, extra) {
  for (const canal of canales) {
    // Si el canal no implementa este aviso, se saltea (así el email
    // "no manda" lista de espera ni recordatorios: simplemente no los define).
    if (typeof canal[metodo] !== 'function') continue;
    try {
      await canal[metodo](usuario, evento, extra);
    } catch (err) {
      // Aislamiento: un canal caído no frena a los demás.
      console.error(`[notif] canal "${canal.nombre}" método "${metodo}":`, err.message);
    }
  }
}
```

### 2. El servicio dispara el aviso fuera de la transacción (`services/inscripcion.service.js`)

```javascript
// La inscripción ya está commiteada; la notificación es un efecto secundario.
// Si esto falla, la inscripción NO se pierde.
try {
  const usuario = await Usuario.findByPk(usuarioId);
  if (usuario) {
    if (estadoFinal === 'CONFIRMADO') {
      await notificaciones.inscripcionConfirmada(usuario, evento);
    } else {
      await notificaciones.inscripcionEnEspera(usuario, evento);
    }
  }
} catch (error) {
  console.log('Error al notificar al usuario:', error);
}
```

### 3. La marca anti-duplicado del recordatorio (`jobs/recordatorios.job.js`)

```javascript
// Eventos publicados que empiezan dentro de 24 h y sin recordatorio enviado.
const eventos = await Evento.findAll({
  where: {
    estado: 'PUBLICADO',
    recordatorio_enviado_en: null,
    fecha: { [Op.gt]: ahora, [Op.lte]: limite },
  },
});

for (const evento of eventos) {
  // Claim atómico: solo un proceso logra pasar de NULL a timestamp.
  const [afectadas] = await Evento.update(
    { recordatorio_enviado_en: ahora },
    { where: { id: evento.id, recordatorio_enviado_en: null } }
  );
  if (afectadas === 0) continue; // otra instancia/corrida ya lo tomó
  // ... buscar inscriptos CONFIRMADO y notificar uno por uno ...
}
```

### 4. Un canal concreto: in-app persiste en la BD (`integrations/channels/in-app.channel.js`)

```javascript
module.exports = {
  nombre: 'in-app',

  async inscripcionConfirmada(usuario, evento) {
    // "Enviar" en este canal = crear la fila que la campana del frontend lee.
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Confirmación de Inscripción',
      mensaje: `Te has inscrito exitosamente${evento?.titulo ? ` a ${evento.titulo}` : ' al evento'}.`,
      tipo: 'INSCRIPCION',
    });
  },
  // ... resto de los 6 avisos, mismo patrón ...
};
```

### 5. El canal push limpia suscripciones muertas (`integrations/channels/push.channel.js`)

```javascript
for (const registro of suscripciones) {
  const subscription = { endpoint: registro.endpoint, keys: registro.keys };
  try {
    await enviarPush(subscription, { title: titulo, body: cuerpo });
  } catch (err) {
    // 410 = la suscripción expiró (el usuario desinstaló o revocó permiso):
    // se borra de la BD para no reintentar contra un endpoint muerto.
    if (err.statusCode === 410) {
      await registro.destroy();
    } else {
      console.error(`[push] Error enviando a ${registro.endpoint}:`, err.message);
    }
  }
}
```

## Fuera del circuito (contexto para defender)

- **El recordatorio depende de que el proceso esté vivo.** `node-cron` corre adentro del proceso de Node: no es un cron del sistema operativo ni una cola externa. En un hosting gratuito que suspende el proceso por inactividad (Render free, por ejemplo), el job no corre mientras el servidor está dormido. La ventana de 24 h amortigua el problema: cuando el proceso despierta, la corrida siguiente agarra los eventos que todavía están dentro de la ventana. Pero si el servidor pasa dormido las 24 horas previas al evento, ese recordatorio no sale. Es una limitación asumida: un cron externo o una cola administrada exceden el alcance del TP.

- **Canales que se desactivan solos si faltan variables.** Sin `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `integrations/push.service.js → asegurarVapid()` loguea un warning y `enviarPush` retorna sin enviar nada. Sin `RESEND_API_KEY`, `integrations/email.service.js` simula el envío por consola (loguea destinatario y asunto). En los dos casos el hub sigue andando: el canal in-app solo necesita la BD, así que la campana funciona siempre.

- **La difusión por Telegram/Discord no pasa por este hub.** Los anuncios al canal del grupo cuando se publica o cancela un evento van por otro camino: `integrations/eventos.hooks.js` (los handlers se registran en `integrations/register.js`) hacia `telegram.service.js` y `discord.service.js`. Son mensajes de nivel grupo — un canal público, sin destinatario individual — distintos de las notificaciones personales de este circuito; por eso no son un canal más del array `canales`, cuyos métodos reciben siempre un `usuario`. También se apagan solos si faltan sus variables (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL_ID`, `DISCORD_BOT_TOKEN`/`DISCORD_CHANNEL_ID`).
