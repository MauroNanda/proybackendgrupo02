const { PushSubscription } = require('../models');
const HttpError = require('../utils/http-error');

class PushService {
  /**
   * Guarda la suscripción que manda el navegador (endpoint + keys).
   * Si el mismo endpoint ya existía, actualizamos las keys.
   */
  async guardarSuscripcion(usuarioId, datos) {
    const { endpoint, keys } = datos;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new HttpError('La suscripción push es inválida', 400);
    }

    const existente = await PushSubscription.findOne({ where: { endpoint } });

    if (existente) {
      existente.usuario_id = usuarioId;
      existente.keys = keys;
      await existente.save();
      return existente;
    }

    return PushSubscription.create({
      usuario_id: usuarioId,
      endpoint,
      keys,
    });
  }
}

module.exports = new PushService();
