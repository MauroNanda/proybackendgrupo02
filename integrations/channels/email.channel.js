const fs = require('fs');
const path = require('path');
const { enviarEmail } = require('../email.service');

// Canal de notificación por email (Resend).
// Nota: no implementa `inscripcionEnEspera` a propósito → el hub simplemente lo
// omite (no se manda email cuando el usuario queda en lista de espera).

function plantillaConfirmada() {
  const p = path.join(__dirname, '../templates/inscripcion-confirmada.html');
  return fs.readFileSync(p, 'utf8');
}

// Escapa lo que pueda venir del usuario/DB antes de meterlo en el HTML del mail.
function esc(texto = '') {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fechaLegible(fecha) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleString('es-AR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

module.exports = {
  nombre: 'email',

  async inscripcionConfirmada(usuario) {
    if (!usuario?.email) return;
    await enviarEmail(usuario.email, '¡Inscripción confirmada!', plantillaConfirmada());
  },

  async cupoLiberado(usuario) {
    if (!usuario?.email) return;
    await enviarEmail(usuario.email, '¡Tu inscripción ha sido confirmada!', plantillaConfirmada());
  },

  // Cancelación: notificación crítica → sí va por email, con el nombre del evento.
  async eventoCancelado(usuario, evento) {
    if (!usuario?.email) return;
    const titulo = evento?.titulo ? esc(evento.titulo) : 'un evento';
    const html =
      `<p>Lamentamos avisarte que <strong>${titulo}</strong> fue <strong>cancelado</strong>.</p>` +
      `<p>Tu inscripción quedó sin efecto — no hace falta que hagas nada.</p>` +
      `<p>Gracias por la comprensión. — Convoca</p>`;
    await enviarEmail(usuario.email, `Evento cancelado: ${evento?.titulo || ''}`.trim(), html);
  },

  // Cambio de fecha/lugar de un evento publicado: info operativa → email.
  async eventoModificado(usuario, evento, cambios = {}) {
    if (!usuario?.email) return;
    const titulo = evento?.titulo ? esc(evento.titulo) : 'un evento';
    const lineas = [];
    if (cambios.fecha) lineas.push(`<li>Nueva fecha: <strong>${esc(fechaLegible(evento.fecha))}</strong></li>`);
    if (cambios.ubicacion) lineas.push(`<li>Nuevo lugar: <strong>${esc(evento.ubicacion)}</strong></li>`);
    const html =
      `<p>Hubo cambios en <strong>${titulo}</strong>, donde estás inscripto:</p>` +
      `<ul>${lineas.join('')}</ul>` +
      `<p>Revisá el detalle en Convoca.</p>`;
    await enviarEmail(usuario.email, `Cambios en: ${evento?.titulo || ''}`.trim(), html);
  },
};
