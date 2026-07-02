const { Notificacion, Inscripcion, Evento, Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const crypto = require('crypto');
const { enviarEmail } = require('../integrations/email.service');
const fs = require('fs');
const path = require('path');

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
    // 1. Verificar si el evento existe
    const evento = await Evento.findByPk(eventoId);
    if (!evento) {
      throw new HttpError('El evento no existe', 404);
    }

    // 2. Verificar si el usuario ya tiene una inscripción activa (CONFIRMADO, ESPERA, ASISTIO)
    const inscripcionExistente = await Inscripcion.findOne({
      where: { usuarioId, eventoId }
    });

    if (inscripcionExistente) {
      if (['CONFIRMADO', 'ESPERA', 'ASISTIO'].includes(inscripcionExistente.estado)) {
        throw new HttpError('Ya te encuentras registrado en este evento con estado: ' + inscripcionExistente.estado, 400);
      }
    }

    // 3. Contar cupos ocupados (inscripciones en estado CONFIRMADO o ASISTIO)
    const totalConfirmados = await Inscripcion.count({
      where: {
        eventoId,
        estado: ['CONFIRMADO', 'ASISTIO']
      }
    });

    // Determinar estado de la inscripción
    let estadoFinal = 'CONFIRMADO';
    if (totalConfirmados >= evento.cupo_maximo) {
      estadoFinal = 'ESPERA';
    }

    const nuevoQrToken = crypto.randomUUID();

    let inscripcionFinal;

    if (inscripcionExistente) {
      // Reutilizar el registro cancelado
      inscripcionExistente.estado = estadoFinal;
      inscripcionExistente.qr_token = nuevoQrToken;
      await inscripcionExistente.save();
      inscripcionFinal = inscripcionExistente;
    } else {
      // Crear nueva inscripción
      inscripcionFinal = await Inscripcion.create({
        usuarioId,
        eventoId,
        estado: estadoFinal,
        qr_token: nuevoQrToken
      });
    }


    // --- LÓGICA DE NOTIFICACIÓN  ---
    try {
      const usuario = await Usuario.findByPk(usuarioId);

      // 1. Guardar en base de datos
      await Notificacion.create({
        usuario_id: usuarioId,
        titulo: 'Confirmación de Inscripción',
        mensaje: `Te has inscrito exitosamente al evento.`,
        tipo: 'INSCRIPCION'
      });

      // 2. Enviar el email
      if (estadoFinal === 'CONFIRMADO') {
        const templatePath = path.join(__dirname, '../integrations/templates/inscripcion-confirmada.html');
        const htmlContent = fs.readFileSync(templatePath, 'utf8');
        await enviarEmail(usuario.email, '¡Inscripción confirmada!', htmlContent);
      }
    } catch (error) {
      console.log("Error al notificar al usuario:", error);
    }

    return inscripcionFinal;
  }




  /**
   * Cancela una inscripción y promueve al siguiente en lista de espera si corresponde.
   */
  async cancelar(usuarioId, eventoId) {
    // 1. Buscar la inscripción activa
    const inscripcion = await Inscripcion.findOne({
      where: {
        usuarioId,
        eventoId,
        estado: ['CONFIRMADO', 'ESPERA']
      }
    });

    if (!inscripcion) {
      throw new HttpError('No tienes ninguna inscripción activa para este evento', 404);
    }

    const estadoAnterior = inscripcion.estado;

    // 2. Cambiar estado a CANCELADO
    inscripcion.estado = 'CANCELADO';
    await inscripcion.save();

    // 3. Si estaba CONFIRMADO, promover al primero en lista de espera (ESPERA)
    if (estadoAnterior === 'CONFIRMADO') {
      const siguienteEnEspera = await Inscripcion.findOne({
        where: {
          eventoId,
          estado: 'ESPERA'
        },
        order: [['createdAt', 'ASC']]
      });

      if (siguienteEnEspera) {
        siguienteEnEspera.estado = 'CONFIRMADO';
        await siguienteEnEspera.save();

        // Notificar al usuario promovido (Email + DB log)
        try {
          const usuarioPromovido = await Usuario.findByPk(siguienteEnEspera.usuarioId);
          if (usuarioPromovido) {
            await Notificacion.create({
              usuario_id: siguienteEnEspera.usuarioId,
              titulo: 'Inscripción Confirmada desde Lista de Espera',
              mensaje: 'Se liberó un cupo y has sido promovido a la lista de confirmados.',
              tipo: 'CUPO_LIBERADO'
            });

            const templatePath = path.join(__dirname, '../integrations/templates/inscripcion-confirmada.html');
            const htmlContent = fs.readFileSync(templatePath, 'utf8');
            await enviarEmail(usuarioPromovido.email, '¡Tu inscripción ha sido confirmada!', htmlContent);
          }
        } catch (error) {
          console.log('Error al notificar al usuario promovido:', error);
        }
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
}

module.exports = new InscripcionService();
