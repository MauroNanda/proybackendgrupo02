const HttpError = require('../utils/http-error');

/**
 * Restringe el acceso a usuarios con uno de los roles indicados.
 * Debe usarse después de authMiddleware (req.usuario ya existe).
 */
function roleMiddleware(rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.usuario) {
      return next(new HttpError('Token de autenticación requerido', 401));
    }

    // 403: la persona esta autenticada, pero su rol no permite esta operacion.
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new HttpError('No tienes permisos para acceder a este recurso', 403));
    }

    next();
  };
}

module.exports = roleMiddleware;
