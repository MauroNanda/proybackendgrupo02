# Circuito: Integración con Telegram

**Responsable:** Mauro

## Qué hace

Cuando un organizador publica un evento, el sistema lo anuncia en un canal de Telegram del grupo; si un evento publicado se cancela, también avisa la cancelación en el mismo canal. El bot es de difusión pura: solo envía mensajes (un POST a la API de Telegram), nunca recibe ni lee nada.

## Flujo paso a paso

### Publicación de un evento

1. **El organizador publica un evento.** Puede ser al crearlo directamente en estado `PUBLICADO` (`crear` en `services/evento.service.js`) o al editar un borrador y pasarlo a `PUBLICADO` (`actualizar`, que solo dispara en la *transición* de estado, no en cada edición).
2. **El servicio de eventos avisa.** Llama a `eventosHooks.alPublicarEvento(eventoCompleto)` (con el evento ya cargado con sus categorías). No sabe ni le importa quién escucha.
3. **El hub de hooks ejecuta los handlers registrados.** En `integrations/eventos.hooks.js`, `alPublicarEvento` recorre los handlers anotados con `onPublicado` y ejecuta cada uno dentro de un `try/catch` propio.
4. **El bot arma el mensaje.** `anunciarEvento` en `integrations/telegram.service.js` construye el texto con `formatearAnuncio`: título en negrita, descripción truncada a 200 caracteres, fecha formateada ("vie 17/07 · 18:00 hs"), ubicación, aviso de urgencia si el evento cae dentro de las próximas 48 hs y tono de escasez si el cupo es chico (≤ 20 lugares). Todo el contenido del usuario pasa por `escaparHtml` porque el mensaje se envía con `parse_mode: 'HTML'`.
5. **Se agrega el botón de inscripción.** `construirBotones` arma un botón inline "Inscribirme" que apunta al detalle del evento en el frontend (`FRONTEND_URL/eventos/:id`). Telegram rechaza URLs no públicas en botones, así que en desarrollo (localhost) el link va como texto dentro del mensaje en lugar de botón.
6. **Se publica en el canal.** `enviarMensaje` hace un `POST` a `https://api.telegram.org/bot<TOKEN>/sendMessage` con `chat_id` = el canal configurado. Si faltan las variables de entorno, solo loguea un warning y no envía (la app sigue funcionando sin Telegram).

### Cancelación de un evento

1. El organizador edita un evento publicado y lo pasa a estado `CANCELADO` (`actualizar` en `services/evento.service.js`, condición `seCancela`: solo si *antes no estaba* cancelado).
2. El servicio llama a `eventosHooks.alCancelarEvento(eventoCompleto)`.
3. El hub ejecuta el handler registrado, que llama a `anunciarCancelacion` en `telegram.service.js`.
4. `formatearCancelacion` arma el aviso: "Cancelado: <título>", la fecha en la que estaba previsto y una aclaración para los inscriptos (su inscripción quedó sin efecto). Se envía por el mismo `enviarMensaje` al mismo canal.

Nota: este aviso al canal es la difusión *grupal*. En paralelo, el servicio de eventos también notifica *personalmente* a cada inscripto afectado (`integrations/notificaciones`), pero ese es otro circuito.

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `integrations/telegram.service.js` | El bot en sí: arma el mensaje HTML (`formatearAnuncio`, `formatearCancelacion`), el botón inline (`construirBotones`) y lo envía a la API de Telegram (`enviarMensaje`). Exporta `anunciarEvento` y `anunciarCancelacion`. |
| `integrations/eventos.hooks.js` | Hub de hooks del ciclo de vida de eventos. Ofrece `onPublicado`/`onCancelado` para suscribirse y `alPublicarEvento`/`alCancelarEvento` para disparar. Aísla errores de cada handler. |
| `integrations/register.js` | Punto único de cableado: suscribe `telegram.anunciarEvento` a `onPublicado` y `telegram.anunciarCancelacion` a `onCancelado`. Se invoca una sola vez al arrancar la app. |
| `services/evento.service.js` | Lógica de negocio de eventos. Dispara `alPublicarEvento` (en `crear` si nace publicado, y en `actualizar` en la transición a `PUBLICADO`) y `alCancelarEvento` (transición a `CANCELADO`). |
| `app.js` | Llama a `registrarIntegraciones()` al iniciar el backend (línea 63). |

**Variables de entorno:**

| Variable | Para qué |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot (lo da BotFather). Sin él, la difusión queda desactivada con un warning. |
| `TELEGRAM_CHANNEL_ID` | ID/chat del canal donde el bot publica (el bot debe ser admin del canal). |
| `FRONTEND_URL` (o `CORS_ORIGIN`) | Base para armar el link "Inscribirme" al detalle del evento. Default: `http://localhost:4200`. |

## Puntos clave para la defensa

- **La difusión no toca la lógica de negocio.** `evento.service.js` solo conoce el hub genérico (`eventosHooks.alPublicarEvento`); no importa Telegram ni Discord. Quién reacciona a "se publicó un evento" se decide en un único lugar (`integrations/register.js`). Agregar o quitar una integración es una línea en `register.js`, sin modificar el servicio de eventos (patrón observer / publish-subscribe casero).
- **Un fallo en Telegram no rompe el alta del evento.** En `eventos.hooks.js`, cada handler corre dentro de su propio `try/catch` (`alPublicarEvento`, líneas 20-28): si la API de Telegram falla (`enviarMensaje` lanza `Error` cuando la respuesta no es OK), el error se loguea con `console.error('[evento-hook] publicado:', ...)` y el evento igual se crea/actualiza y se responde 200 al organizador.
- **Difusión unidireccional.** El bot no hace polling ni tiene webhook: `telegram.service.js` solo hace `fetch POST /sendMessage`. No recibe ni procesa mensajes de usuarios; es sistema → canal, nunca al revés.
- **Configuración opcional.** `estaConfigurado()` verifica token y canal; si faltan, `enviarMensaje` retorna con un warning en vez de romper. El token nunca está en el código, solo en variables de entorno.
- **Prevención de inyección HTML.** Como el mensaje usa `parse_mode: 'HTML'`, todo texto ingresado por el usuario (título, descripción, ubicación) pasa por `escaparHtml` antes de interpolarse (escapa `&`, `<`, `>`).
- **Se anuncia solo la transición de estado.** En `actualizar`, la condición es `evento.estado === 'PUBLICADO' && estadoAnterior !== 'PUBLICADO'`: editar un evento ya publicado no lo re-anuncia, y cancelar dos veces no duplica el aviso.

## Bloques de código clave

### 1. Registro del bot en el hub (`integrations/register.js`)

```js
function registrarIntegraciones() {
  // Nivel grupo: difundir en el canal de Telegram cuando se publica un evento.
  eventosHooks.onPublicado((evento) => telegram.anunciarEvento(evento));
  // Aviso al canal de Telegram cuando un evento se cancela.
  eventosHooks.onCancelado((evento) => telegram.anunciarCancelacion(evento));
  // ...
}
```

Este es el único lugar que sabe que "publicar un evento" implica "avisar por Telegram". El servicio de eventos no lo sabe.

### 2. El hub aísla los errores (`integrations/eventos.hooks.js`)

```js
async function alPublicarEvento(evento) {
  for (const fn of handlers.publicado) {
    try {
      await fn(evento);          // ejecuta cada integración registrada
    } catch (err) {
      // Un fallo del bot NO rompe el alta/edición del evento
      console.error('[evento-hook] publicado:', err.message);
    }
  }
}
```

### 3. Armado del anuncio (`integrations/telegram.service.js`, `formatearAnuncio`)

```js
const lineas = [
  // Urgencia si el evento es en las próximas 48 hs
  evento.fecha && esProximo(evento.fecha) ? '⏰ <b>¡Es muy pronto!</b>' : null,
  `📣 <b>${escaparHtml(evento.titulo)}</b>`,          // título escapado (parse_mode HTML)
  '',
  evento.descripcion ? escaparHtml(truncar(evento.descripcion)) : null, // máx. 200 chars
  '',
  fechaLinea,                                          // "🗓️ vie 17/07 · 18:00 hs"
  evento.ubicacion ? `📍 ${escaparHtml(evento.ubicacion)}` : null,
  cupoLinea,                                           // "👥 ¡Solo 15 lugares!" si el cupo es chico
  incluirLinkTexto && url ? `\n🔗 <a href="${url}">Inscribite acá</a>` : null,
];
return lineas.filter((l) => l !== null).join('\n');
```

### 4. Envío al canal (`integrations/telegram.service.js`, `enviarMensaje`)

```js
async function enviarMensaje(text, extra = {}) {
  if (!estaConfigurado()) {
    // Sin token/canal: warning y listo, la app sigue funcionando
    console.warn('⚠️  [Telegram] ... Difusión desactivada.');
    return;
  }
  const respuesta = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, parse_mode: 'HTML', text, ...extra }),
  });
  if (!respuesta.ok) {
    // El error lo atrapa el try/catch del hub, no llega al organizador
    throw new Error(`Telegram sendMessage falló: ${respuesta.status} ...`);
  }
}
```

## Fuera del circuito (contexto para defender)

- **Configuración previa (una sola vez, fuera del código).** El bot se crea hablando con **@BotFather** en Telegram (`/newbot`): ahí se elige el nombre y BotFather devuelve el token (`TELEGRAM_BOT_TOKEN`). Después se crea el canal y se agrega el bot como **administrador** — sin ser admin no puede publicar en un canal. `TELEGRAM_CHANNEL_ID` es el identificador de ese canal: el `@usuario` si el canal es público, o el id numérico (formato `-100...`) si es privado. Ambas cosas van al `.env`, nunca al repositorio.
- **Si faltan las variables.** `estaConfigurado()` devuelve `false`, `enviarMensaje` loguea "Difusión desactivada" y retorna. El backend arranca y funciona completo; lo único que no pasa es el anuncio en el canal. Esto permite que cada integrante desarrolle sin tener el bot configurado.
- **Es difusión de un solo sentido.** El bot no tiene webhook ni hace polling (`getUpdates`): no hay ningún código que reciba mensajes. Si alguien le escribe al bot o comenta en el canal, nuestro sistema ni se entera. La inscripción real siempre ocurre en la web; Telegram solo lleva gente hacia allá.
- **El enlace depende de `FRONTEND_URL`.** El botón "Inscribirme" apunta a `FRONTEND_URL/eventos/:id`. En producción esa variable debe tener el dominio real del frontend desplegado; si quedara en el default (`http://localhost:4200`), Telegram rechaza la URL como botón y el link viaja como texto dentro del mensaje, que en el celular de otra persona no lleva a ningún lado.
