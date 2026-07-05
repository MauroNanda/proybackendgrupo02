const pushService = require('../services/push.service');
const { obtenerClavePublica } = require('../integrations/push.service');

class PushController {
  /** Devuelve la clave pública VAPID para que el front pueda suscribirse */
  clavePublica(_req, res) {
    const clave = obtenerClavePublica();
    if (!clave) {
      return res.status(503).json({
        error: { message: 'Web Push no está configurado en el servidor' },
      });
    }
    res.json({ publicKey: clave });
  }

  async subscribe(req, res, next) {
    try {
      const suscripcion = await pushService.guardarSuscripcion(req.usuario.id, req.body);
      res.status(201).json({
        ok: true,
        id: suscripcion.id,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PushController();
