const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_ALGORITHM = 'HS256';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET debe estar definido en el entorno y tener al menos 32 caracteres.'
  );
}

/**
 * Firma un token JWT con el payload provisto usando HS256.
 * @param {object} payload - Objeto con los datos a incluir en el token.
 * @param {string} [expiresIn] - Tiempo de expiración opcional.
 * @returns {string} Token firmado.
 */
function firmarToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: JWT_ALGORITHM,
  });
}

/**
 * Verifica un token JWT restringiendo el algoritmo permitido a HS256.
 * @param {string} token - Token JWT a verificar.
 * @returns {object} Payload decodificado si es válido.
 * @throws {Error} Si el token es inválido, expiró o usa otro algoritmo.
 */
function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });
}

module.exports = {
  firmarToken,
  verificarToken,
  JWT_EXPIRES_IN,
};