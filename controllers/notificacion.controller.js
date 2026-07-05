const notificacionService = require('../services/notificacion.service');

class NotificacionController {
  async obtenerPorUsuario(req, res, next) {
    try {
      const data = await notificacionService.obtenerPorUsuario(req.usuario.id, req.query);
      res.json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async marcarComoLeida(req, res, next) {
    try {
      const notificacion = await notificacionService.marcarComoLeida(req.params.id, req.usuario.id);
      res.json({
        status: 'success',
        data: notificacion
      });
    } catch (error) {
      next(error);
    }
  }

  async marcarTodasComoLeidas(req, res, next) {
    try {
      const result = await notificacionService.marcarTodasComoLeidas(req.usuario.id);
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificacionController();
