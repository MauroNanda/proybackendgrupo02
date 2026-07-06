# Circuito: Integración con Discord

**Responsable:** Seba Velázquez

## Qué hace

Cuando un organizador publica un evento, el sistema lo anuncia automáticamente en un canal de Discord mediante un embed (tarjeta enriquecida con título, descripción, fecha, lugar y cupo). El bot es de difusión pura: mantiene una sesión abierta con Discord pero solo envía mensajes al canal, nunca lee ni responde nada.

## Flujo paso a paso

1. **El organizador publica un evento.** Puede ser al crearlo directamente en estado `PUBLICADO` (`crear` en `services/evento.service.js`) o al editar un borrador y pasarlo a `PUBLICADO` (`actualizar`, que solo dispara en la *transición* de estado, no en cada edición).
2. **El servicio de eventos avisa.** Llama a `eventosHooks.alPublicarEvento(eventoCompleto)` (con el evento ya cargado con sus categorías). No sabe ni le importa quién escucha.
3. **El hub de hooks ejecuta los handlers registrados.** En `integrations/eventos.hooks.js`, `alPublicarEvento` recorre los handlers anotados con `onPublicado` (entre ellos el de Discord, registrado en `integrations/register.js`) y ejecuta cada uno dentro de un `try/catch` propio.
4. **El bot verifica que está listo.** `anunciarEvento` en `integrations/discord.service.js` chequea la bandera `isReady` (el bot hizo login al arrancar el backend y ya emitió el evento `clientReady`) y que `DISCORD_CHANNEL_ID` esté configurado. Si algo falta, loguea y retorna sin romper nada.
5. **El bot arma el embed.** Construye un `EmbedBuilder` con: color "blurple" (#5865F2), autor "Nuevo evento en Convoca", título del evento (truncado a 256 caracteres, límite de la API), descripción truncada a 200 caracteres y escapada de markdown, y fields de Fecha (timestamp nativo `<t:unix:F>` que cada usuario ve en su propia zona horaria), Lugar y Cupo (este último solo si el evento lo define, con tono de escasez si es ≤ 20 lugares). Si el evento cae dentro de las próximas 48 hs, la descripción abre con "¡Es muy pronto!". Si la URL del frontend es pública (no localhost), el título queda clickeable hacia el detalle del evento (`setURL`).
6. **Lo publica en el canal.** Resuelve el canal con `client.channels.fetch(channelId)` y hace `channel.send({ embeds: [embedAnuncio] })`. Todo el envío está dentro de un `try/catch` propio: si Discord falla, se loguea el error y la publicación del evento sigue su curso normal.

A diferencia de Telegram, el bot de Discord **no** anuncia cancelaciones: en `register.js` solo está suscripto a `onPublicado`.

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `integrations/discord.service.js` | El bot: crea el cliente de discord.js (solo intent `Guilds`), hace login al importar el módulo, arma el embed (`anunciarEvento`) y lo envía al canal. |
| `integrations/eventos.hooks.js` | Hub de hooks del ciclo de vida de eventos. Ofrece `onPublicado` para suscribirse y `alPublicarEvento` para disparar. Aísla errores de cada handler. |
| `integrations/register.js` | Punto único de cableado: suscribe `discord.anunciarEvento` a `onPublicado`. Se invoca una sola vez al arrancar la app. |
| `services/evento.service.js` | Lógica de negocio de eventos. Dispara `alPublicarEvento` en `crear` (si nace publicado) y en `actualizar` (transición a `PUBLICADO`). |
| `app.js` | Llama a `registrarIntegraciones()` al iniciar el backend (línea 63). |

**Variables de entorno:**

| Variable | Para qué |
|---|---|
| `DISCORD_BOT_TOKEN` | Token del bot (Developer Portal de Discord). Sin él, no se hace login y solo queda un warning. |
| `DISCORD_CHANNEL_ID` | ID del canal de texto donde el bot publica (el bot debe estar invitado al servidor con permiso de enviar mensajes). |
| `FRONTEND_URL` | Base para el link del título del embed al detalle del evento. Default: `http://localhost:4200` (en ese caso el título no es clickeable, porque Discord rechaza localhost). |

## Puntos clave para la defensa

- **La difusión no toca la lógica de negocio.** `evento.service.js` solo conoce el hub genérico (`eventosHooks.alPublicarEvento`); no importa `discord.service.js` en ningún lado. La conexión "evento publicado → embed en Discord" vive únicamente en `integrations/register.js` (patrón observer / publish-subscribe casero). Discord se agregó después de Telegram sin modificar una sola línea del servicio de eventos: fue una línea nueva en `register.js`.
- **Un fallo en Discord no rompe el alta del evento.** Doble aislamiento: (1) `anunciarEvento` en `discord.service.js` envuelve todo el envío en su propio `try/catch` y loguea "`Error aislado al intentar enviar el mensaje a Discord`"; (2) aunque ese catch no existiera, el hub en `eventos.hooks.js` también atrapa la excepción de cada handler. En cualquier caso el organizador recibe su respuesta 200.
- **Difusión unidireccional.** El cliente se crea solo con el intent `Guilds` (lo mínimo para resolver el canal y postear). No se usan intents privilegiados como `MessageContent` o `GuildPresences` porque el bot no lee mensajes de nadie; es sistema → canal, nunca al revés. Además, activar intents privilegiados sin habilitarlos en el Developer Portal haría fallar el login.
- **Arranque tolerante.** El login se hace al levantar el backend, de forma asíncrona y con `.catch`: si el token falta o es inválido, la API arranca igual (solo sin difusión a Discord). La bandera `isReady` evita intentar enviar antes de que la conexión esté establecida.
- **Saneamiento del contenido.** La descripción y el lugar renderizan markdown en Discord, así que se truncan primero y se escapan después (`sanear` = `escapeMarkdown(truncar(...))`; el orden importa: escapar antes de truncar podría dejar una barra invertida cortada al final). El título del embed no renderiza markdown, por eso no se escapa (mostraría barras literales) y solo se respeta el límite de 256 caracteres.
- **Fecha sin problemas de zona horaria.** Se usa el timestamp nativo de Discord (`<t:unix:F>` + `<t:unix:R>`): cada usuario lo ve en su propia zona horaria e idioma, sin depender del timezone del servidor.

## Bloques de código clave

### 1. Conexión del bot (`integrations/discord.service.js`)

```js
// Solo intent Guilds: alcanza para resolver el canal y postear.
// No leemos mensajes → no hacen falta intents privilegiados.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let isReady = false;
client.once('clientReady', () => {
  console.log(`[Discord Bot] Conectado exitosamente como: ${client.user.tag}`);
  isReady = true;
});

// Login asíncrono al arrancar el backend; si falla, la API sigue funcionando.
if (process.env.DISCORD_BOT_TOKEN) {
  client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('[Discord Bot] Error crítico al iniciar sesión:', err.message);
  });
}
```

### 2. Registro en el hub (`integrations/register.js`)

```js
function registrarIntegraciones() {
  // ...handlers de Telegram...
  // Difundir también en el canal de Discord al publicar un evento.
  eventosHooks.onPublicado((evento) => discord.anunciarEvento(evento));
}
```

Único punto donde el sistema "sabe" que publicar un evento implica avisar por Discord.

### 3. Armado del embed (`integrations/discord.service.js`, dentro de `anunciarEvento`)

```js
const fields = [
  {
    name: '📅 Fecha',
    // Timestamp nativo: cada usuario lo ve en SU zona horaria
    value: evento.fecha ? formatearFechaDiscord(evento.fecha) : 'A confirmar',
    inline: true,
  },
  {
    name: '📍 Lugar',
    // sanear = truncar + escapeMarkdown (en ese orden)
    value: evento.ubicacion ? sanear(evento.ubicacion, 100) : 'Virtual / A confirmar',
    inline: true,
  },
];
// El cupo solo aparece si el evento lo define
const cupo = formatearCupo(evento.cupo_maximo);
if (cupo) fields.push({ name: '👥 Cupo', value: cupo, inline: true });

const embedAnuncio = new EmbedBuilder()
  .setColor('#5865F2')                                  // blurple, se ve "nativo"
  .setAuthor({ name: '📣 Nuevo evento en Convoca' })
  .setTitle(titulo)                                     // truncado a 256 (límite API)
  .setDescription(lineas.join('\n\n'))                  // urgencia + descripción saneada
  .addFields(fields)
  .setTimestamp()
  .setFooter({ text: 'Convoca · Anuncio automático' });
```

### 4. Envío aislado al canal (`integrations/discord.service.js`)

```js
try {
  const channel = await client.channels.fetch(channelId);
  // ...armado del embed...
  await channel.send({ embeds: [embedAnuncio] });
  console.log(`[Discord Bot] Anuncio enviado con éxito para el evento: ${evento.titulo}`);
} catch (error) {
  // Criterio de aceptación: un fallo en Discord NO rompe el flujo principal
  console.error('[Discord Bot] Error aislado al intentar enviar el mensaje a Discord:', error.message);
}
```
