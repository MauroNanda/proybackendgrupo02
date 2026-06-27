const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'convoca-secret-key-super-secure';
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
};
