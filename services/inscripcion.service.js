const { Inscripcion, Evento, Usuario, sequelize } = require('../models');
const HttpError = require('../utils/http-error');
const crypto = require('crypto');
const notificaciones = require('../integrations/notificaciones');

/**
 * Servicio para gestionar la lógica de negocio de Inscripciones.
 */
class InscripcionService {
  /**
   * Obtiene la inscripción de un usuario en un evento.
   */
  async obtenerInscripcion(usuarioId, eventoId) {
    return await Inscripcion.findOne({
      where: { usuarioId, eventoId }
    });
  }

  /**
   * Registra un usuario a un evento con validación de cupo y lista de espera.
   */
  async inscribirse(usuarioId, eventoId) {
    // La validación de cupo y la creación se hacen dentro de una transacción con
    // bloqueo de fila del evento para evitar sobreventa por inscripciones concurrentes.
    const { inscripcionFinal, estadoFinal, evento } = await sequelize.transaction(async (t) => {
      // 1. Verificar si el evento existe (bloqueando la fila hasta el commit)
      const evento = await Evento.findByPk(eventoId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!evento) {
        throw new HttpError('El evento no existe', 404);
      }

      // 1.b. Solo se admite inscripción a eventos PUBLICADOS y que aún no ocurrieron.
      // BORRADOR se trata como inexistente (404) para no revelar eventos no visibles;
      // CANCELADO y fecha pasada son conflictos con el estado del recurso (409).
      // Se valida acá, con la fila ya bloqueada, para que una cancelación
      // concurrente del evento no se cruce con esta inscripción.
      if (evento.estado === 'BORRADOR') {
        throw new HttpError('El evento no existe', 404);
      }
      if (evento.estado === 'CANCELADO') {
        throw new HttpError('El evento fue cancelado y no admite inscripciones', 409);
      }
      // fecha es DataTypes.DATE (timestamptz): comparar con new Date() es seguro
      // (ambas en UTC). El guard de null es defensivo ante datos legacy.
      if (evento.fecha && new Date(evento.fecha) < new Date()) {
        throw new HttpError('El evento ya se realizó y no admite nuevas inscripciones', 409);
      }

      // 2. Verificar si el usuario ya tiene una inscripción activa
      const inscripcionExistente = await Inscripcion.findOne({
        where: { usuarioId, eventoId },
        transaction: t,
      });

      if (inscripcionExistente &&
          ['CONFIRMADO', 'ESPERA', 'ASISTIO'].includes(inscripcionExistente.estado)) {
        throw new HttpError('Ya te encuentras registrado en este evento con estado: ' + inscripcionExistente.estado, 400);
      }

      // 3. Contar cupos ocupados dentro de la transacción
      const totalConfirmados = await Inscripcion.count({
        where: {
          eventoId,
          estado: ['CONFIRMADO', 'ASISTIO']
        },
        transaction: t,
      });

      // Determinar estado de la inscripción
      const estado = totalConfirmados >= evento.cupo_maximo ? 'ESPERA' : 'CONFIRMADO';
      const nuevoQrToken = crypto.randomUUID();

      let inscripcion;
      if (inscripcionExistente) {
        // Reutilizar el registro cancelado
        inscripcionExistente.estado = estado;
        inscripcionExistente.qr_token = nuevoQrToken;
        await inscripcionExistente.save({ transaction: t });
        inscripcion = inscripcionExistente;
      } else {
        // Crear nueva inscripción
        inscripcion = await Inscripcion.create({
          usuarioId,
          eventoId,
          estado,
          qr_token: nuevoQrToken
        }, { transaction: t });
      }

      return { inscripcionFinal: inscripcion, estadoFinal: estado, evento };
    });

    // --- NOTIFICACIÓN (fuera de la transacción; efecto secundario, no bloquea) ---
    // El hub decide qué canales usar (in-app, email, y a futuro Telegram/Push).
    try {
      const usuario = await Usuario.findByPk(usuarioId);
      if (usuario) {
        if (estadoFinal === 'CONFIRMADO') {
          await notificaciones.inscripcionConfirmada(usuario, evento);
        } else {
          await notificaciones.inscripcionEnEspera(usuario, evento);
        }
      }
    } catch (error) {
      console.log('Error al notificar al usuario:', error);
    }

    return inscripcionFinal;
  }




  /**
   * Cancela una inscripción y promueve al siguiente en lista de espera si corresponde.
   */
  async cancelar(usuarioId, eventoId) {
    // Cancelación y promoción del siguiente en lista de espera se hacen atómicamente.
    const { inscripcion, promovidoId } = await sequelize.transaction(async (t) => {
      // 1. Buscar la inscripción activa
      const insc = await Inscripcion.findOne({
        where: {
          usuarioId,
          eventoId,
          estado: ['CONFIRMADO', 'ESPERA']
        },
        transaction: t,
      });

      if (!insc) {
        throw new HttpError('No tienes ninguna inscripción activa para este evento', 404);
      }

      const estadoAnterior = insc.estado;

      // 2. Cambiar estado a CANCELADO
      insc.estado = 'CANCELADO';
      await insc.save({ transaction: t });

      // 3. Si estaba CONFIRMADO, promover al primero en lista de espera (ESPERA)
      let promovido = null;
      if (estadoAnterior === 'CONFIRMADO') {
        const siguienteEnEspera = await Inscripcion.findOne({
          where: { eventoId, estado: 'ESPERA' },
          order: [['createdAt', 'ASC']],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (siguienteEnEspera) {
          siguienteEnEspera.estado = 'CONFIRMADO';
          await siguienteEnEspera.save({ transaction: t });
          promovido = siguienteEnEspera.usuarioId;
        }
      }

      return { inscripcion: insc, promovidoId: promovido };
    });

    // Notificar al usuario promovido fuera de la transacción (efecto secundario).
    if (promovidoId) {
      try {
        const usuarioPromovido = await Usuario.findByPk(promovidoId);
        if (usuarioPromovido) {
          await notificaciones.cupoLiberado(usuarioPromovido);
        }
      } catch (error) {
        console.log('Error al notificar al usuario promovido:', error);
      }
    }

    return inscripcion;
  }

  /**
   * Registra el check-in (asistencia) del usuario mediante su QR token.
   */
  async checkIn(qrToken) {
    const inscripcion = await Inscripcion.findOne({
      where: { qr_token: qrToken },
      include: [
        { model: Evento, as: 'evento' },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
      ]
    });

    if (!inscripcion) {
      throw new HttpError('Código QR de inscripción no válido', 404);
    }

    if (inscripcion.estado === 'ASISTIO') {
      throw new HttpError('La asistencia ya fue registrada previamente para esta inscripción', 400);
    }

    if (inscripcion.estado !== 'CONFIRMADO') {
      throw new HttpError('Solo se puede realizar el check-in para inscripciones confirmadas', 400);
    }

    inscripcion.estado = 'ASISTIO';
    await inscripcion.save();

    return inscripcion;
  }

  /**
   * Obtiene la lista de inscritos para un evento con filtros de búsqueda y estado.
   */
  async obtenerInscriptosPorEvento(eventoId, queryParams = {}) {
    const { estado, search } = queryParams;
    // Clamp de paginación para evitar valores fuera de rango (limit máx. 100).
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const where = { eventoId };
    if (estado) {
      where.estado = estado;
    }

    const { Op } = require('sequelize');
    const includeUserWhere = {};

    if (search) {
      includeUserWhere[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const result = await Inscripcion.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email', 'rol'],
          where: Object.keys(includeUserWhere).length > 0 ? includeUserWhere : undefined
        }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']]
    });

    // Calcular estadísticas agrupadas por estado para este evento
    const statsResult = await Inscripcion.findAll({
      where: { eventoId },
      attributes: [
        'estado',
        [Inscripcion.sequelize.fn('COUNT', Inscripcion.sequelize.col('id')), 'count']
      ],
      group: ['estado']
    });

    const stats = {
      CONFIRMADO: 0,
      ESPERA: 0,
      ASISTIO: 0,
      CANCELADO: 0
    };

    statsResult.forEach(item => {
      const state = item.getDataValue('estado');
      const stateCount = parseInt(item.getDataValue('count'), 10) || 0;
      if (state in stats) {
        stats[state] = stateCount;
      }
    });

    return {
      rows: result.rows,
      count: result.count,
      stats
    };
  }

  /**
   * Registra check-in manual para una inscripción.
   */
  async checkInManual(id) {
    const inscripcion = await Inscripcion.findByPk(id, {
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }]
    });

    if (!inscripcion) {
      throw new HttpError('Inscripción no encontrada', 404);
    }

    if (inscripcion.estado === 'ASISTIO') {
      throw new HttpError('La asistencia ya fue registrada previamente', 400);
    }

    if (inscripcion.estado !== 'CONFIRMADO') {
      throw new HttpError('Solo se puede realizar el check-in para inscripciones confirmadas', 400);
    }

    inscripcion.estado = 'ASISTIO';
    await inscripcion.save();

    return inscripcion;
  }
}

module.exports = new InscripcionService();
