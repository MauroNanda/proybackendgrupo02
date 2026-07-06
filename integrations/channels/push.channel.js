const { PushSubscription } = require('../../models');
const { enviarPush } = require('../push.service');

// Canal Web Push del hub de notificaciones.
// Cuando el usuario se inscribe, el hub llama acá y nosotros mandamos al navegador.

async function enviarATodasDelUsuario(usuario, titulo, cuerpo) {
  if (!usuario?.id) return;

  const suscripciones = await PushSubscription.findAll({
    where: { usuario_id: usuario.id },
  });

  if (suscripciones.length === 0) return;

  for (const registro of suscripciones) {
    const subscription = {
      endpoint: registro.endpoint,
      keys: registro.keys,
    };

    try {
      await enviarPush(subscription, { title: titulo, body: cuerpo });
    } catch (err) {
      // 410 = la suscripción expiró (el usuario desinstaló o revocó permiso)
      if (err.statusCode === 410) {
        await registro.destroy();
      } else {
        console.error(`[push] Error enviando a ${registro.endpoint}:`, err.message);
      }
    }
  }
}

module.exports = {
  nombre: 'web-push',

  async inscripcionConfirmada(usuario, evento) {
    const titulo = 'Inscripción confirmada';
    const cuerpo = evento?.titulo
      ? `Quedaste inscripto a "${evento.titulo}".`
      : 'Tu inscripción al evento fue confirmada.';
    await enviarATodasDelUsuario(usuario, titulo, cuerpo);
  },

  async inscripcionEnEspera(usuario, evento) {
    const titulo = 'Lista de espera';
    const cuerpo = evento?.titulo
      ? `El cupo de "${evento.titulo}" está lleno. Quedaste en espera.`
      : 'Quedaste en lista de espera para el evento.';
    await enviarATodasDelUsuario(usuario, titulo, cuerpo);
  },

  async cupoLiberado(usuario, evento) {
    const cuerpo = evento?.titulo
      ? `Se liberó un lugar en "${evento.titulo}" y tu inscripción fue confirmada.`
      : 'Se liberó un lugar y tu inscripción fue confirmada.';
    await enviarATodasDelUsuario(usuario, 'Cupo liberado', cuerpo);
  },

  async eventoCancelado(usuario, evento) {
    const cuerpo = evento?.titulo
      ? `El evento "${evento.titulo}" fue cancelado. Tu inscripción quedó sin efecto.`
      : 'Un evento en el que estabas inscripto fue cancelado.';
    await enviarATodasDelUsuario(usuario, 'Evento cancelado', cuerpo);
  },

  async eventoModificado(usuario, evento, cambios = {}) {
    const partes = [];
    if (cambios.fecha) partes.push('cambió la fecha');
    if (cambios.ubicacion) partes.push('cambió el lugar');
    const detalle = partes.length ? ` (${partes.join(' y ')})` : '';
    const cuerpo = `El evento${evento?.titulo ? ` "${evento.titulo}"` : ''} tuvo cambios${detalle}. Revisá los detalles.`;
    await enviarATodasDelUsuario(usuario, 'Cambio en un evento', cuerpo);
  },

  async recordatorioEvento(usuario, evento) {
    const cuando = evento?.fecha
      ? new Date(evento.fecha).toLocaleString('es-AR', {
          weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Argentina/Jujuy',
        })
      : 'pronto';
    const cuerpo = evento?.titulo
      ? `"${evento.titulo}" empieza ${cuando}${evento.ubicacion ? ` en ${evento.ubicacion}` : ''}. ¡Te esperamos!`
      : 'Tenés un evento que empieza en menos de 24 horas.';
    await enviarATodasDelUsuario(usuario, 'Recordatorio de evento', cuerpo);
  },
};
