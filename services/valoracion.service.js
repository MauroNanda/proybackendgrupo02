const { Valoracion, Inscripcion, Evento } = require('../models');
const HttpError = require('../utils/http-error');

class ValoracionService {
  /**
   * Crea o actualiza la valoración del usuario para un evento.
   * Solo si asistió o si el evento ya pasó y tenía inscripción confirmada.
   */
  async guardar(usuarioId, { evento_id, puntuacion, comentario }) {
    const evento = await Evento.findByPk(evento_id);
    if (!evento) {
      throw new HttpError('Evento no encontrado', 404);
    }

    const inscripcion = await Inscripcion.findOne({
      where: { usuarioId, eventoId: evento_id },
    });

    if (!inscripcion) {
      throw new HttpError('Debés estar inscripto para valorar este evento', 403);
    }

    const eventoFinalizado = new Date(evento.fecha) < new Date();
    const puedeValorar =
      inscripcion.estado === 'ASISTIO' ||
      (inscripcion.estado === 'CONFIRMADO' && eventoFinalizado);

    if (!puedeValorar) {
      throw new HttpError(
        'Podés valorar cuando hayas asistido o cuando el evento haya finalizado',
        403
      );
    }

    const existente = await Valoracion.findOne({
      where: { usuario_id: usuarioId, evento_id },
    });

    if (existente) {
      existente.puntuacion = puntuacion;
      existente.comentario = comentario || null;
      await existente.save();
      return existente;
    }

    return Valoracion.create({
      usuario_id: usuarioId,
      evento_id,
      puntuacion,
      comentario: comentario || null,
    });
  }

  async obtenerMiValoracion(usuarioId, eventoId) {
    return Valoracion.findOne({
      where: { usuario_id: usuarioId, evento_id: eventoId },
    });
  }
}

module.exports = new ValoracionService();
