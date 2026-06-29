const { verificarToken } = require('../utils/jwt.util');
const HttpError = require('../utils/http-error');

/**
 * Verifica el JWT del header Authorization y adjunta el payload en req.usuario.
 * Rutas sin token o con token inválido responden 401.
 */
function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError('Token de autenticación requerido', 401));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verificarToken(token);
    req.usuario = {
      id: payload.id,
      email: payload.email,
      rol: payload.rol,
    };
    next();
  } catch {
    next(new HttpError('Token inválido o expirado', 401));
  }
}

module.exports = authMiddleware;
