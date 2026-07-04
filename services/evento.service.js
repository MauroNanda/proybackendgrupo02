const { Evento, Categoria } = require('../models');

class EventoService {
  async listar(categoria) {
    const where = {
      estado: 'PUBLICADO',
    };

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
    throw new Error('Evento no encontrado');
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






}

module.exports = new EventoService();