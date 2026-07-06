const inApp = require('./channels/in-app.channel');
const email = require('./channels/email.channel');
const push = require('./channels/push.channel');

// ============================================================================
// HUB DE NOTIFICACIONES
// ----------------------------------------------------------------------------
// Punto único de envío de notificaciones. Los servicios (ej. inscripcion.service)
// llaman a los métodos de acá y NO conocen los canales concretos.
//
// Para agregar un canal nuevo (Telegram, Web Push, etc.):
//   1. Crear ./channels/<nombre>.channel.js exportando un objeto con la propiedad
//      `nombre` y los métodos que quiera implementar
//      (inscripcionConfirmada / inscripcionEnEspera / cupoLiberado).
//   2. Agregarlo al array `canales` de abajo (o usar registrarCanal()).
// El hub ignora los métodos que un canal no implemente y aísla los errores por
// canal (si un canal falla, los demás siguen). No hace falta tocar los servicios.
// ============================================================================

const canales = [inApp, email, push];

async function emitir(metodo, usuario, evento) {
  for (const canal of canales) {
    if (typeof canal[metodo] !== 'function') continue;
    try {
      await canal[metodo](usuario, evento);
    } catch (err) {
      console.error(`[notif] canal "${canal.nombre}" método "${metodo}":`, err.message);
    }
  }
}

module.exports = {
  // Permite registrar un canal en runtime (alternativa a editar el array).
  registrarCanal: (canal) => canales.push(canal),

  inscripcionConfirmada: (usuario, evento) => emitir('inscripcionConfirmada', usuario, evento),
  inscripcionEnEspera: (usuario, evento) => emitir('inscripcionEnEspera', usuario, evento),
  cupoLiberado: (usuario, evento) => emitir('cupoLiberado', usuario, evento),
};
