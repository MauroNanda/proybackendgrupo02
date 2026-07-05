const jwt = require('jsonwebtoken');

// Sin valor por defecto: si JWT_SECRET no está definido, la app no debe arrancar
// (la validación de arranque en app.js lo verifica antes de aceptar tráfico).
const JWT_SECRET = process.env.JWT_SECRET;
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
