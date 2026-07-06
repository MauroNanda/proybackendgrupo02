const inscripcionService = require('../services/inscripcion.service');

/**
 * Controlador de Inscripciones.
 * Intermedia entre el cliente HTTP y el servicio de negocio de inscripciones.
 */
class InscripcionController {
  async obtenerEstado(req, res, next) {
    try {
      const { eventoId } = req.params;
      const usuarioId = req.usuario.id;
      const inscripcion = await inscripcionService.obtenerInscripcion(usuarioId, eventoId);

      if (!inscripcion) {
        return res.json({ inscrito: false, estado: null, qr_token: null });
      }

      res.json({
        inscrito: true,
        estado: inscripcion.estado,
        qr_token: inscripcion.qr_token
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerMisInscripciones(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const inscripciones = await inscripcionService.obtenerMisInscripciones(usuarioId);
      res.json(inscripciones);
    } catch (err) {
      next(err);
    }
  }

  async inscribirse(req, res, next) {
    try {
      const { eventoId } = req.body;
      const usuarioId = req.usuario.id;

      if (!eventoId) {
        return res.status(400).json({ error: { message: 'El eventoId es obligatorio.' } });
      }

      const inscripcion = await inscripcionService.inscribirse(usuarioId, eventoId);
      res.status(201).json(inscripcion);
    } catch (err) {
      next(err);
    }
  }

  async cancelar(req, res, next) {
    try {
      const { eventoId } = req.params;
      const usuarioId = req.usuario.id;

      const inscripcion = await inscripcionService.cancelar(usuarioId, eventoId);
      res.json(inscripcion);
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const { qr_token } = req.body;

      if (!qr_token) {
        return res.status(400).json({ error: { message: 'El qr_token es obligatorio.' } });
      }

      const inscripcion = await inscripcionService.checkIn(qr_token);
      res.json({
        message: 'Check-in realizado con éxito.',
        inscripcion
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerInscriptosPorEvento(req, res, next) {
    try {
      const { eventoId } = req.params;
      const { estado, search, limit, page } = req.query;

      if (!eventoId) {
        return res.status(400).json({ error: { message: 'El eventoId es obligatorio.' } });
      }

      const result = await inscripcionService.obtenerInscriptosPorEvento(eventoId, {
        estado,
        search,
        limit,
        page
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async checkInManual(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: { message: 'El id de inscripción es obligatorio.' } });
      }

      const inscripcion = await inscripcionService.checkInManual(id);
      res.json({
        message: 'Check-in manual realizado con éxito.',
        inscripcion
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InscripcionController();
