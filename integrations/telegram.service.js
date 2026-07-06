/* global fetch */
// Integración con Telegram — nivel grupo (difusión).
// El bot solo ENVÍA mensajes a un canal fijo cuando se publica un evento.
// No recibe mensajes (sin polling): es un simple POST a la API de Telegram.
// Nota: usa el fetch global (Node 18+).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHANNEL_ID;
const API_BASE = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;
// Base del frontend para armar el link al detalle del evento.
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:4200';

// Escapa los caracteres que Telegram interpreta como HTML.
function escaparHtml(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detalleUrl(evento) {
  return evento.id ? `${FRONTEND_URL}/eventos/${evento.id}` : null;
}

// Telegram solo acepta URLs públicas en botones inline (rechaza localhost).
// En dev (localhost) caemos a un link de texto dentro del mensaje.
function esUrlPublica(url) {
  return /^https?:\/\//.test(url) && !/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
}

// Fecha compacta y escaneable: "vie 17/07 · 18:00 hs".
function formatearFecha(fechaISO) {
  const d = new Date(fechaISO);
  const dia = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora} hs`;
}

// ¿La fecha del evento cae dentro de las próximas 48 hs?
function esProximo(fechaISO) {
  const diff = new Date(fechaISO).getTime() - Date.now();
  return diff > 0 && diff <= 48 * 60 * 60 * 1000;
}

function truncar(texto, max = 200) {
  const t = String(texto).trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

// `incluirLinkTexto`: agrega el link como texto (fallback cuando no se usa botón).
function formatearAnuncio(evento, incluirLinkTexto) {
  const url = detalleUrl(evento);
  const fechaLinea = evento.fecha
    ? `🗓️ ${escaparHtml(formatearFecha(evento.fecha))}`
    : '🗓️ <i>Fecha a confirmar</i>';
  const cupoLinea = evento.cupo_maximo
    ? evento.cupo_maximo <= 20
      ? `👥 ¡Solo ${evento.cupo_maximo} lugares!`
      : `👥 Cupo limitado: ${evento.cupo_maximo} lugares`
    : null;
  const lineas = [
    evento.fecha && esProximo(evento.fecha) ? '⏰ <b>¡Es muy pronto!</b>' : null,
    `📣 <b>${escaparHtml(evento.titulo)}</b>`,
    '',
    evento.descripcion ? escaparHtml(truncar(evento.descripcion)) : null,
    '',
    fechaLinea,
    evento.ubicacion ? `📍 ${escaparHtml(evento.ubicacion)}` : null,
    cupoLinea,
    incluirLinkTexto && url ? `\n🔗 <a href="${url}">Inscribite acá</a>` : null,
  ];
  return lineas.filter((l) => l !== null).join('\n');
}

// Botones inline del anuncio. Devuelve el reply_markup de Telegram, o null si no hay botones.
function construirBotones(evento) {
  const fila = [];

  const url = detalleUrl(evento);
  if (url && esUrlPublica(url)) {
    fila.push({ text: '✍️ Inscribirme', url });
  }

  // TODO (T-15 Google Calendar — lo desarrolla otra integrante):
  // cuando esté definida la URL de "Agendar", agregar acá el segundo botón:
  //   fila.push({ text: '📅 Agendar', url: calendarUrl(evento) });
  // No requiere más cambios: el botón viaja en el mismo reply_markup.

  if (fila.length === 0) return null;
  return { inline_keyboard: [fila] };
}

function estaConfigurado() {
  return Boolean(TOKEN && CHAT_ID);
}

// Envío base a Telegram. `extra` permite sumar campos (ej. reply_markup).
async function enviarMensaje(text, extra = {}) {
  if (!estaConfigurado()) {
    console.warn(
      '⚠️  [Telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID no configurados. Difusión desactivada.'
    );
    return;
  }

  const respuesta = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, parse_mode: 'HTML', text, ...extra }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Telegram sendMessage falló: ${respuesta.status} ${detalle}`);
  }
}

// Publica el anuncio de un evento en el canal de Telegram.
async function anunciarEvento(evento) {
  const botones = construirBotones(evento);
  // Si hay botón (URL pública) no repetimos el link como texto; si no, lo incluimos.
  await enviarMensaje(
    formatearAnuncio(evento, !botones),
    botones ? { reply_markup: botones } : {}
  );
}

function formatearCancelacion(evento) {
  const fecha = evento.fecha ? formatearFecha(evento.fecha) : null;
  const lineas = [
    `❌ <b>Cancelado: ${escaparHtml(evento.titulo)}</b>`,
    '',
    fecha
      ? `El evento previsto para el ${escaparHtml(fecha)} no se va a realizar.`
      : 'El evento no se va a realizar.',
    'Si estabas inscripto, tu inscripción quedó sin efecto — no hace falta que hagas nada.',
    '',
    'Gracias por la comprensión. ¡Te esperamos en el próximo! 💪',
  ];
  return lineas.filter((l) => l !== null).join('\n');
}

// Publica el aviso de cancelación de un evento en el canal.
async function anunciarCancelacion(evento) {
  await enviarMensaje(formatearCancelacion(evento));
}

module.exports = { anunciarEvento, anunciarCancelacion, estaConfigurado };
