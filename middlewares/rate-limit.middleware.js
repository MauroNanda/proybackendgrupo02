const rateLimit = require('express-rate-limit');

// Limitadores para endpoints sensibles de autenticación.
// Mitigan ataques de fuerza bruta (consigna §5 — prevención de ataques).

// Login: 10 intentos por IP cada 15 minutos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos de inicio de sesión. Intentá de nuevo en unos minutos.' } },
});

// Registro: 5 cuentas por IP cada hora.
const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiados registros desde esta dirección. Intentá de nuevo más tarde.' } },
});

// Verificación 2FA: 5 intentos por IP cada 15 minutos. Sumado al código de un
// solo uso y a la expiración de 10 min, cierra la fuerza bruta del código.
const codigo2faLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos de verificación. Intentá de nuevo en unos minutos.' } },
});

module.exports = { loginLimiter, registroLimiter, codigo2faLimiter };
