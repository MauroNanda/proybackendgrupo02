const { Evento, Categoria, Inscripcion, EventoCategoria, sequelize } = require('../models');
const HttpError = require('../utils/http-error');
const eventosHooks = require('../integrations/eventos.hooks');

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

  await evento.update(datosEvento);

  if (categorias) {
    await evento.setCategorias(categorias);
  }

  // Al cancelar un evento, dar de baja las inscripciones activas (antes de
  // notificar, para que el aviso "tu inscripción quedó sin efecto" sea verdad).
  if (evento.estado === 'CANCELADO' && estadoAnterior !== 'CANCELADO') {
    await Inscripcion.update(
      { estado: 'CANCELADO' },
      { where: { eventoId: id, estado: ['CONFIRMADO', 'ESPERA'] } }
    );
  }

  const eventoCompleto = await this._conCategorias(id);

  // Disparar hooks solo en la transición de estado (no en cada edición).
  if (evento.estado === 'PUBLICADO' && estadoAnterior !== 'PUBLICADO') {
    await eventosHooks.alPublicarEvento(eventoCompleto);
  } else if (evento.estado === 'CANCELADO' && estadoAnterior !== 'CANCELADO') {
    await eventosHooks.alCancelarEvento(eventoCompleto);
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