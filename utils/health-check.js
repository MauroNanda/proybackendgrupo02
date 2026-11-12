'use strict';
function healthCheck(authenticate, env = process.env) {
  return async (_req, res) => {
    let available = false;
    try { await authenticate(); available = true; } catch { /* no revelar errores de conexión */ }
    res.status(available ? 200 : 503).json({
      status: available ? 'ok' : 'degraded', database: available ? 'up' : 'down',
      environment: env.NODE_ENV || 'development',
      commit: env.GIT_COMMIT || null, version: env.APP_VERSION || null,
      timestamp: new Date().toISOString(),
    });
  };
}
module.exports = { healthCheck };
