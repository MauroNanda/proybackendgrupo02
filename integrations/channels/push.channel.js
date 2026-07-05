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

  async cupoLiberado(usuario) {
    await enviarATodasDelUsuario(
      usuario,
      'Cupo liberado',
      'Se liberó un lugar y tu inscripción fue confirmada.'
    );
  },
};
