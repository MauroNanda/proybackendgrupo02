const { verificarToken } = require('../utils/jwt.util');
const HttpError = require('../utils/http-error');

/**
 * Middleware para proteger rutas que requieren autenticación.
 * Verifica la firma y vigencia del JWT provisto en la cabecera Authorization.
 */
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError('Acceso denegado. No se proporcionó un token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verificarToken(token);

    req.usuario = decoded;
    next();
  } catch {
    next(new HttpError('Token no válido o expirado.', 401));
  }
};
