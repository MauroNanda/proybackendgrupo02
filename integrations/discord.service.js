const { Client, GatewayIntentBits, EmbedBuilder, escapeMarkdown } = require('discord.js');

// La difusión es unidireccional (sistema → canal): el bot solo ENVÍA embeds.
// Con el intent `Guilds` alcanza para resolver el canal y postear. No usamos
// intents privilegiados (GuildPresences/MessageContent) porque no leemos nada
// y activarlos exige habilitarlos en el Developer Portal (si no, el login falla).
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Bandera para saber si el bot se conectó correctamente
let isReady = false;

client.once('clientReady', () => {
  console.log(`[Discord Bot] Conectado exitosamente como: ${client.user.tag}`);
  isReady = true;
});

// Iniciamos sesión de forma asíncrona al arrancar el backend
if (process.env.DISCORD_BOT_TOKEN) {
  client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('[Discord Bot] Error crítico al iniciar sesión:', err.message);
  });
} else {
  console.warn('[Discord Bot] DISCORD_BOT_TOKEN no configurado en el archivo .env');
}

// Límites de presentación del anuncio (mismos criterios que el bot de Telegram).
const DESCRIPCION_MAX = 200;   // chars antes de truncar con "…"
const HORAS_URGENCIA = 48;     // ventana para marcar "¡Es muy pronto!"
const CUPO_ESCASO = 20;        // umbral para el tono de escasez

// Recorta texto largo para que el embed no domine el canal; el detalle completo
// vive en la web, acá solo necesitamos el gancho.
function truncar(texto, max = DESCRIPCION_MAX) {
  const limpio = (texto || '').trim();
  if (!limpio) return '';
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
}

// Escapa markdown DESPUÉS de truncar: si escapáramos primero, el corte podría
// dejar una barra invertida suelta al final.
function sanear(texto, max) {
  return escapeMarkdown(truncar(texto, max));
}

// Timestamp nativo de Discord: cada usuario lo ve en SU zona horaria e idioma.
// F = fecha completa con día de semana y hora; R = relativo ("en 2 días").
// Evita el bug de toLocaleString dependiendo del timezone del servidor.
function formatearFechaDiscord(fecha) {
  const unix = Math.floor(new Date(fecha).getTime() / 1000);
  return `<t:${unix}:F>\n<t:${unix}:R>`;
}

// El evento es "urgente" si cae dentro de las próximas 48hs (y no pasó ya).
function esUrgente(fecha) {
  const horasRestantes = (new Date(fecha).getTime() - Date.now()) / 3_600_000;
  return horasRestantes > 0 && horasRestantes <= HORAS_URGENCIA;
}

// Tono de escasez según el tamaño del cupo, igual que en Telegram.
// Devuelve null si no hay cupo definido para omitir el field por completo.
function formatearCupo(cupo) {
  if (!Number.isInteger(cupo) || cupo <= 0) return null;
  return cupo <= CUPO_ESCASO
    ? `¡Solo **${cupo}** lugares!`
    : `Cupo limitado: **${cupo}** lugares`;
}

/**
 * Anuncia un evento nuevo en el canal de Discord configurado.
 * Criterio de Aceptación clave: Un fallo en Discord NO debe romper el flujo principal (try/catch).
 */
async function anunciarEvento(evento) {
  if (!isReady) {
    console.warn('[Discord Bot] No se pudo enviar el anuncio: El bot aún no está listo.');
    return;
  }

  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    console.error('[Discord Bot] DISCORD_CHANNEL_ID no está definido en el entorno.');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`[Discord Bot] No se encontró el canal con ID: ${channelId}`);
      return;
    }

    // Link al detalle del evento en el frontend. Va en el título (setURL):
    // es el CTA nativo del embed sin necesitar components/botones (tarea futura).
    // Solo lo agregamos si la URL es pública: Discord rechaza localhost.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const urlEvento = `${frontendUrl}/eventos/${evento.id}`;
    const urlPublica = /^https?:\/\//.test(urlEvento) && !/localhost|127\.0\.0\.1/i.test(urlEvento);

    // El título del embed NO renderiza markdown, así que no se escapa
    // (escaparlo mostraría barras invertidas literales). Solo respetamos
    // el límite de 256 chars que impone la API.
    const titulo = truncar(evento.titulo || 'Sin título', 256);

    // La descripción SÍ renderiza markdown → truncamos y escapamos.
    // Si el evento es inminente, la urgencia abre el mensaje.
    const lineas = [];
    if (evento.fecha && esUrgente(evento.fecha)) {
      lineas.push('⏰ **¡Es muy pronto!**');
    }
    lineas.push(
      sanear(evento.descripcion) || 'Todavía no hay descripción — mirá el detalle en la web.'
    );

    const fields = [
      {
        name: '📅 Fecha',
        value: evento.fecha ? formatearFechaDiscord(evento.fecha) : 'A confirmar',
        inline: true,
      },
      {
        name: '📍 Lugar',
        value: evento.ubicacion ? sanear(evento.ubicacion, 100) : 'Virtual / A confirmar',
        inline: true,
      },
    ];

    // El cupo solo aparece si el evento lo define: un field vacío mete ruido.
    const cupo = formatearCupo(evento.cupo_maximo);
    if (cupo) {
      fields.push({ name: '👥 Cupo', value: cupo, inline: true });
    }

    const embedAnuncio = new EmbedBuilder()
      .setColor('#5865F2') // Blurple: el embed se siente "nativo" del canal
      .setAuthor({ name: '📣 Nuevo evento en Convoca' })
      .setTitle(titulo)
      .setDescription(lineas.join('\n\n'))
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Convoca · Anuncio automático' });

    // El título clickeable solo si el link es público (evita error de API en dev).
    if (urlPublica) {
      embedAnuncio.setURL(urlEvento);
    }

    await channel.send({ embeds: [embedAnuncio] });
    console.log(`[Discord Bot] Anuncio enviado con éxito para el evento: ${evento.titulo}`);

  } catch (error) {
    // ⚠️ Cumplimos criterio de aceptación: el hook aísla el error para que la API no falle
    console.error('[Discord Bot] Error aislado al intentar enviar el mensaje a Discord:', error.message);
  }
}

module.exports = {
  anunciarEvento
}; 