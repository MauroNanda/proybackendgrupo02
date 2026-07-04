const eventoService = require('../services/evento.service');

class EventoController {
  async listar(req, res, next) {
    try {
      const { categoria, todos } = req.query;
      const mostrarTodos = todos === 'true' || todos === true;

      const eventos = await eventoService.listar(categoria, mostrarTodos);

      res.json(eventos);
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;

      const evento = await eventoService.obtenerPorId(id);

      if (!evento) {
        return res.status(404).json({
          mensaje: 'Evento no encontrado',
        });
      }

      res.json(evento);
    } catch (error) {
      next(error);
    }
  }








async crear(req, res, next) {
    try {
      const evento = await eventoService.crear(req.body);
      res.status(201).json(evento);
    } catch (err) {
      next(err);
    }
  }






   async actualizar(req, res, next) {
    try {
      const evento = await eventoService.actualizar(
        req.params.id,
        req.body
      );

      res.json(evento);
    } catch (err) {
      next(err);
    }
  }

  async eliminar(req, res, next) {
    try {
      await eventoService.eliminar(req.params.id);
      res.json({ mensaje: 'Evento eliminado correctamente' });
    } catch (err) {
      if (err.message === 'Evento no encontrado') {
        res.status(404).json({ mensaje: err.message });
      } else {
        next(err);
      }
    }
  }
}

module.exports = new EventoController();