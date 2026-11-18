const { Evento, Categoria, Inscripcion, Usuario, EventoCategoria, sequelize } = require('../models');
const { Op } = require('sequelize');
const HttpError = require('../utils/http-error');
const eventosHooks = require('../integrations/eventos.hooks');
const notificaciones = require('../integrations/notificaciones');

// Permitir campos concretos impide que el cliente imponga id o fechas internas.
const CAMPOS_EVENTO_PERMITIDOS = [
  'titulo',
  'descripcion',
  'fecha',
  'ubicacion',
  'cupo_maximo',
  'estado',
];

// % y _ escritos por el usuario se buscan como texto, no como comodines SQL.
function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, '\\$&');
}

class EventoService {
  _filtrarCamposEvento(datos = {}) {
    const filtrado = {};
    for (const campo of CAMPOS_EVENTO_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(datos, campo) && datos[campo] !== undefined) {
        filtrado[campo] = datos[campo];
      }
    }
    return filtrado;
  }

  async listar(categoria, todos = false, search = '') {
    const where = {};

    if (!todos) {
      where.estado = {
        [Op.in]: ['PUBLICADO', 'CANCELADO'],
      };
      where.fecha = {
        [Op.gte]: new Date(),
      };
    }

    if (search) {
      const termino = escaparLike(search.trim());
      if (termino) {
        where.titulo = {
          [Op.iLike]: `%${termino}%`,
        };
      }
    }

    const include = [
      {
        model: Categoria,
        as: 'categorias',
        through: { attributes: [] },
      },
      {
        model: Inscripcion,
        as: 'inscripciones',
        attributes: ['id', 'estado'],
        required: false,
        // Sequelize carga las inscripciones aparte para no multiplicar filas del evento.
        separate: true,
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
          as: 'categorias',
          through: { attributes: [] },
        },
      ],
    });
  }

  async _conCategorias(id) {
    return await Evento.findByPk(id, {
      include: [{ model: Categoria, as: 'categorias', through: { attributes: [] } }],
    });
  }

  async crear(datos) {
    const { categorias } = datos;
    const datosEvento = this._filtrarCamposEvento(datos);
    datosEvento.descripcion = datosEvento.descripcion ?? '';

    const evento = await Evento.create(datosEvento);

    if (categorias && categorias.length > 0) {
      await evento.setCategorias(categorias);
    }

    const eventoCompleto = await this._conCategorias(evento.id);

    if (eventoCompleto.estado === 'PUBLICADO') {
      await eventosHooks.alPublicarEvento(eventoCompleto);
    }

    return eventoCompleto;
  }

  async actualizar(id, datos) {
    const { categorias } = datos;
    const datosEvento = this._filtrarCamposEvento(datos);

    const evento = await Evento.findByPk(id);

    if (!evento) {
      throw new HttpError('Evento no encontrado', 404);
    }

    if (datosEvento.cupo_maximo !== undefined) {
      const countActive = await Inscripcion.count({
        where: {
          eventoId: id,
          estado: { [Op.in]: ['CONFIRMADO', 'ASISTIO'] },
        },
      });
      if (datosEvento.cupo_maximo < countActive) {
        throw new HttpError(
          `No se puede reducir el cupo a ${datosEvento.cupo_maximo} porque ya existen ${countActive} inscripciones confirmadas/asistidas`,
          400
        );
      }
    }

    const estadoAnterior = evento.estado;
    const fechaAnterior = evento.fecha;
    const ubicacionAnterior = evento.ubicacion;

    await evento.update(datosEvento);

    if (categorias) {
      await evento.setCategorias(categorias);
    }

    const seCancela = evento.estado === 'CANCELADO' && estadoAnterior !== 'CANCELADO';

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

    const cambios = {};
    if (evento.estado === 'PUBLICADO' && estadoAnterior === 'PUBLICADO') {
      if (
        fechaAnterior &&
        evento.fecha &&
        new Date(fechaAnterior).getTime() !== new Date(evento.fecha).getTime()
      ) {
        cambios.fecha = true;
      }
      if (ubicacionAnterior !== evento.ubicacion) {
        cambios.ubicacion = true;
      }
    }

    const eventoCompleto = await this._conCategorias(id);

    if (evento.estado === 'PUBLICADO' && estadoAnterior !== 'PUBLICADO') {
      await eventosHooks.alPublicarEvento(eventoCompleto);
    } else if (seCancela) {
      await eventosHooks.alCancelarEvento(eventoCompleto);
    }

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
    return await sequelize.transaction(async (t) => {
      const evento = await Evento.findByPk(id, { transaction: t });
      if (!evento) {
        throw new HttpError('Evento no encontrado', 404);
      }
      await Inscripcion.destroy({ where: { eventoId: id }, transaction: t });
      await EventoCategoria.destroy({ where: { eventoId: id }, transaction: t });
      await evento.destroy({ transaction: t });
      return true;
    });
  }
}

module.exports = new EventoService();