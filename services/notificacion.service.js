const { Notificacion } = require('../models');
const HttpError = require('../utils/http-error');

class NotificacionService {
  /**
   * Obtiene las notificaciones del usuario.
   */
  async obtenerPorUsuario(usuarioId, queryParams = {}) {
    const { leida, limit = 10, page = 1 } = queryParams;
    const offset = (page - 1) * limit;

    const where = { usuario_id: usuarioId };
    if (leida !== undefined) {
      where.leida = leida === 'true' || leida === true;
    }

    const { rows, count } = await Notificacion.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [
        ['leida', 'ASC'], // no leídas primero
        ['createdAt', 'DESC']
      ]
    });

    const unreadCount = await Notificacion.count({
      where: { usuario_id: usuarioId, leida: false }
    });

    return {
      rows,
      count,
      unreadCount
    };
  }

  /**
   * Marca una notificación específica como leída.
   */
  async marcarComoLeida(id, usuarioId) {
    const notificacion = await Notificacion.findOne({
      where: { id, usuario_id: usuarioId }
    });

    if (!notificacion) {
      throw new HttpError('Notificación no encontrada', 404);
    }

    notificacion.leida = true;
    await notificacion.save();

    return notificacion;
  }

  /**
   * Marca todas las notificaciones del usuario como leídas.
   */
  async marcarTodasComoLeidas(usuarioId) {
    await Notificacion.update(
      { leida: true },
      { where: { usuario_id: usuarioId, leida: false } }
    );
    return { success: true };
  }
}

module.exports = new NotificacionService();
