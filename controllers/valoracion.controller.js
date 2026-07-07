const valoracionService = require('../services/valoracion.service');

class ValoracionController {
  async guardar(req, res, next) {
    try {
      const valoracion = await valoracionService.guardar(req.usuario.id, req.body);
      res.status(201).json(valoracion);
    } catch (err) {
      next(err);
    }
  }

  async miValoracion(req, res, next) {
    try {
      const valoracion = await valoracionService.obtenerMiValoracion(
        req.usuario.id,
        req.params.eventoId
      );
      res.json(valoracion);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ValoracionController();
