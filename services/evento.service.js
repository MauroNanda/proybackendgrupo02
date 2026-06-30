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
  return await Evento.create(datos);
}

async actualizar(id, datos) {
  const evento = await Evento.findByPk(id);

  if (!evento) {
    throw new Error('Evento no encontrado');
  }

  await evento.update(datos);

  return evento;
}






}

module.exports = new EventoService();