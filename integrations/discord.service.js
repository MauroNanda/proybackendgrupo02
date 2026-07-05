const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Inicializamos el cliente de Discord con los permisos básicos necesarios
// Buscá esta línea y reemplazala para darle todos los permisos de acceso base:
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences
  ] 
});

// Bandera para saber si el bot se conectó correctamente
let isReady = false;

client.once('ready', () => {
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

    // Diseñamos un Embed atractivo para el anuncio del evento
    const embedAnuncio = new EmbedBuilder()
      .setColor('#5865F2') // Color Blurple oficial de Discord
      .setTitle(`🚀 ¡Nuevo Evento Publicado!: ${evento.titulo || 'Sin Título'}`)
      .setDescription(evento.descripcion || 'No hay descripción disponible para este evento.')
      .addFields(
        { name: '📅 Fecha', value: evento.fecha ? new Date(evento.fecha).toLocaleDateString() : 'A confirmar', inline: true },
        { name: '📍 Lugar/Link', value: evento.lugar || 'Virtual / A confirmar', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'ConvocApp — Sistema de Notificaciones Automáticas' });

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