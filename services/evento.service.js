const { Evento, Categoria, Inscripcion, Usuario, EventoCategoria, sequelize } = require('../models');
const HttpError = require('../utils/http-error');
const eventosHooks = require('../integrations/eventos.hooks');
const notificaciones = require('../integrations/notificaciones');

class EventoService {
  async listar(categoria, todos = false, search = '') {
    const where = {};
    const { Op } = require('sequelize');

    if (!todos) {
      // Catálogo público: solo eventos publicados. Los CANCELADOS salen del
      // listado pero siguen accesibles por link directo vía obtenerPorId
      // (el detalle muestra su estado; la inscripción los rechaza con 409).
      where.estado = 'PUBLICADO';

      // Decisión: los eventos pasados SÍ se muestran (historial + valoraciones).
      // Si se decide ocultarlos del catálogo, descomentar:
      // where.fecha = { [Op.gte]: new Date() };
    }

    if (search) {
      where.titulo = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const include = [
      {
        model: Categoria,
        through: { attributes: [] },
      },
    ];

    if (categoria) {
      include[0].where = { nombre: categoria };
    }

    return await Evento.findAll({
      where,
      include,
      order: [['fecha', 'ASC']],
    });
  }

  async obtenerPorId(id) {
    return await Evento.findByPk(id, {
      include: [
        {
          model: Categoria,
          through: { attributes: [] },
        },
      ],
    });
  }




// Recupera un evento con sus categorías (usado para responder y para notificar).
async _conCategorias(id) {
  return await Evento.findByPk(id, {
    include: [{ model: Categoria, through: { attributes: [] } }],
  });
}

async crear(datos) {
  const { categorias, ...datosEvento } = datos;

  const evento = await Evento.create(datosEvento);

  if (categorias && categorias.length > 0) {
    await evento.setCategorias(categorias);
  }

  const eventoCompleto = await this._conCategorias(evento.id);

  // Si nace publicado, difundirlo (Telegram, etc.). El hook aísla errores.
  if (eventoCompleto.estado === 'PUBLICADO') {
    await eventosHooks.alPublicarEvento(eventoCompleto);
  }

  return eventoCompleto;
}

async actualizar(id, datos) {
  const { categorias, ...datosEvento } = datos;

  const evento = await Evento.findByPk(id);

  if (!evento) {
    throw new HttpError('Evento no encontrado', 404);
  }

  const estadoAnterior = evento.estado;
  // Snapshot de campos operativos para detectar cambios que hay que avisar.
  const fechaAnterior = evento.fecha;
  const ubicacionAnterior = evento.ubicacion;

  await evento.update(datosEvento);

  if (categorias) {
    await evento.setCategorias(categorias);
  }

  const seCancela = evento.estado === 'CANCELADO' && estadoAnterior !== 'CANCELADO';

  // Al cancelar: capturar los inscriptos activos ANTES de darlos de baja (después
  // del bulk update quedan en CANCELADO, indistinguibles) para poder notificarles.
  let afectadosCancelacion = [];
  if (seCancela) {
    afectadosCancelacion = await Inscripcion.findAll({
      where: { eventoId: id, estado: ['CONFIRMADO', 'ESPERA'] },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
    });
    await Inscripcion.update(
      { estado: 'CANCELADO' },
      { where: { eventoId: id, estado: ['CONFIRMADO', 'ESPERA'] } }
    );
  }

  // Detectar cambios operativos (fecha/lugar) en un evento que sigue PUBLICADO.
  // Solo sobre eventos ya publicados: editar un BORRADOR no le importa a nadie,
  // y una transición de estado se maneja por los hooks/cancelación de arriba.
  const cambios = {};
  if (evento.estado === 'PUBLICADO' && estadoAnterior === 'PUBLICADO') {
    if (fechaAnterior && evento.fecha &&
        new Date(fechaAnterior).getTime() !== new Date(evento.fecha).getTime()) {
      cambios.fecha = true;
    }
    if (ubicacionAnterior !== evento.ubicacion) {
      cambios.ubicacion = true;
    }
  }

  const eventoCompleto = await this._conCategorias(id);

  // Difusión a nivel grupo (Telegram/Discord) solo en la transición de estado.
  if (evento.estado === 'PUBLICADO' && estadoAnterior !== 'PUBLICADO') {
    await eventosHooks.alPublicarEvento(eventoCompleto);
  } else if (seCancela) {
    await eventosHooks.alCancelarEvento(eventoCompleto);
  }

  // Notificaciones personales a los inscriptos (aisladas: un fallo de un canal
  // o de un usuario no rompe la edición del evento).
  if (afectadosCancelacion.length > 0) {
    for (const insc of afectadosCancelacion) {
      if (!insc.usuario) continue;
      try {
        await notificaciones.eventoCancelado(insc.usuario, eventoCompleto);
      } catch (err) {
        console.error('[evento] notificar cancelación:', err.message);
      }
    }
  } else if (Object.keys(cambios).length > 0) {
    const inscriptos = await Inscripcion.findAll({
      where: { eventoId: id, estado: ['CONFIRMADO', 'ESPERA'] },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
    });
    for (const insc of inscriptos) {
      if (!insc.usuario) continue;
      try {
        await notificaciones.eventoModificado(insc.usuario, eventoCompleto, cambios);
      } catch (err) {
        console.error('[evento] notificar modificación:', err.message);
      }
    }
  }

  return eventoCompleto;
}

  async eliminar(id) {
    // Borrado atómico: si falla algún paso, no queda el evento a medias.
    return await sequelize.transaction(async (t) => {
      const evento = await Evento.findByPk(id, { transaction: t });
      if (!evento) {
        throw new HttpError('Evento no encontrado', 404);
      }
      // Inscripciones asociadas al evento
      await Inscripcion.destroy({ where: { eventoId: id }, transaction: t });
      // Relaciones con categorías
      await EventoCategoria.destroy({ where: { eventoId: id }, transaction: t });
      // El evento
      await evento.destroy({ transaction: t });
      return true;
    });
  }
}

module.exports = new EventoService();