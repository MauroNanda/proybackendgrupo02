const rateLimit = require('express-rate-limit');
const { notificarIncidente } = require('./security-detector.middleware');
const { positiveInt } = require('../config/security');

// Limitadores para endpoints sensibles de autenticación y protección global de /api.

// El healthcheck no consume el cupo de usuarios ni se bloquea durante un ensayo.
const apiLimiter = rateLimit({
  windowMs: positiveInt(process.env.API_RATE_WINDOW_MS,300000,3600000),
  max: positiveInt(process.env.API_RATE_MAX,300,10000),
  // La comprobacion de salud sigue disponible aunque un cliente agote su cupo.
  skip: req=>req.path==='/health',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiadas solicitudes desde esta IP. Intentá de nuevo más tarde.' } },
  handler: (req, res, _next, options) => {
    void notificarIncidente({
      tipo: 'RATE_LIMIT_EXCEEDED',
      severidad: 'media',
      ip: req.ip || req.socket?.remoteAddress || 'desconocida',
      metodo: req.method,
      ruta: req.baseUrl + req.path,
      statusCode: options.statusCode,
      detalle: 'Se superó el umbral de peticiones permitido en /api (HTTP 429).',
    });
    res.status(options.statusCode).json(options.message);
  },
});

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

// Verificación 2FA: 5 intentos por IP cada 15 minutos.
const codigo2faLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos de verificación. Intentá de nuevo en unos minutos.' } },
});

module.exports = { apiLimiter, loginLimiter, registroLimiter, codigo2faLimiter };
