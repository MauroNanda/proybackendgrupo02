const jwt = require('jsonwebtoken');

// En producción JWT_SECRET es obligatorio (lo valida app.js al arrancar).
// En desarrollo, si no está definido, se usa un secreto de respaldo para no
// romper el setup local del equipo (solo hace falta configurar la DB).
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET =
  process.env.JWT_SECRET || (isProd ? undefined : 'convoca-dev-secret-inseguro-no-usar-en-prod');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Firma un token JWT con el payload provisto.
 * @param {object} payload - Objeto con los datos a incluir en el token.
 * @param {string} [expiresIn] - Tiempo de expiración opcional.
 * @returns {string} Token firmado.
 */
function firmarToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifica un token JWT.
 * @param {string} token - Token JWT a verificar.
 * @returns {object} Payload decodificado si es válido.
 * @throws {Error} Si el token es inválido o expiró.
 */
function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  firmarToken,
  verificarToken,
  JWT_EXPIRES_IN,
};
