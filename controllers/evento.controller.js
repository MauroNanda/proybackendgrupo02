const eventoService = require('../services/evento.service');

class EventoController {
  async listar(req, res, next) {
    try {
      const { categoria } = req.query;

      const eventos = await eventoService.listar(categoria);

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
}



module.exports = new EventoController();