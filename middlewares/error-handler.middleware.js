// Middleware central de manejo de errores.
// Express identifica este middleware por su firma (err, req, res, next).
// Debe ser el ÚLTIMO middleware registrado en app.js.

function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Loguear siempre — en producción podría enviarse a un servicio externo.
  console.error('[ERROR]', err);

  res.status(status).json({
    error: {
      message: err.message || 'Error interno del servidor',
      // En desarrollo exponemos el stack para facilitar debug. En producción NO.
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
