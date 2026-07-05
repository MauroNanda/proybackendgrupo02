const { Evento, Categoria, Inscripcion, EventoCategoria, sequelize } = require('../models');
const HttpError = require('../utils/http-error');

class EventoService {
  async listar(categoria, todos = false, search = '') {
    const where = {};
    const { Op } = require('sequelize');

    if (!todos) {
      where.estado = {
        [Op.in]: ['PUBLICADO', 'CANCELADO'],
      };
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




async crear(datos) {
  const { categorias, ...datosEvento } = datos;

  const evento = await Evento.create(datosEvento);

  if (categorias && categorias.length > 0) {
    await evento.setCategorias(categorias);
  }

  return evento;
}

async actualizar(id, datos) {
  const { categorias, ...datosEvento } = datos;

  const evento = await Evento.findByPk(id);

  if (!evento) {
    throw new HttpError('Evento no encontrado', 404);
  }

  await evento.update(datosEvento);

  if (categorias) {
    await evento.setCategorias(categorias);
  }

  return await Evento.findByPk(id, {
    include: [
      {
        model: Categoria,
        through: { attributes: [] },
      },
    ],
    });
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