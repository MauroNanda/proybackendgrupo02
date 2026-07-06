const { verificarToken } = require('../utils/jwt.util');
const { COOKIE_NAME, leerCookie } = require('../utils/cookie.util');
const HttpError = require('../utils/http-error');

/**
 * Verifica el JWT y adjunta el payload en req.usuario.
 * Fuente del token: cookie httpOnly (nueva) o header Authorization: Bearer
 * (legado, se mantiene para Postman y durante la transición del front).
 */
function authMiddleware(req, _res, next) {
  let token = leerCookie(req, COOKIE_NAME);

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return next(new HttpError('Token de autenticación requerido', 401));
  }

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
