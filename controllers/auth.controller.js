const authService = require('../services/auth.service');

class AuthController {
  async registro(req, res, next) {
    try {
      const resultado = await authService.registro(req.body);
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const resultado = await authService.login(req.body);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async perfil(req, res, next) {
    try {
      const usuario = await authService.obtenerPerfil(req.usuario.id);
      res.json(usuario);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
