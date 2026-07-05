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
};
