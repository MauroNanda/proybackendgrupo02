const usuarioService = require('../services/usuario.service');

/**
 * Controlador de Usuarios.
 * Intermedia entre el cliente HTTP y el servicio de negocio.
 * Se encarga de capturar parámetros, invocar servicios y responder.
 */
class UsuarioController {
  async obtenerTodos(req, res, next) {
    try {
      const usuarios = await usuarioService.obtenerTodos();
      res.json(usuarios);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const usuario = await usuarioService.obtenerPorId(req.params.id);
      res.json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const nuevoUsuario = await usuarioService.crear(req.body);
      res.status(201).json(nuevoUsuario);
    } catch (err) {
      next(err);
    }
  }

  async actualizar(req, res, next) {
    try {
      const usuarioActualizado = await usuarioService.actualizar(req.params.id, req.body);
      res.json(usuarioActualizado);
    } catch (err) {
      next(err);
    }
  }

  async eliminar(req, res, next) {
    try {
      const resultado = await usuarioService.eliminar(req.params.id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsuarioController();
