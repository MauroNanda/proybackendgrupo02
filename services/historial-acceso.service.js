const { HistorialAcceso } = require('../models');

/**
 * Registra intentos de acceso (login exitoso o fallido) en HistorialAcceso.
 * Falla en silencio para no bloquear el flujo de autenticación.
 */
function extraerMeta(req) {
  if (!req) return { ip: null, userAgent: null };

  const ipRaw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  const ip = Array.isArray(ipRaw)
    ? ipRaw[0]
    : typeof ipRaw === 'string'
      ? ipRaw.split(',')[0].trim()
      : ipRaw;

  return {
    ip,
    userAgent: req.headers['user-agent'] || null,
  };
}

async function registrar(usuarioId, exitoso, meta = {}) {
  if (!usuarioId) return;

  try {
    await HistorialAcceso.create({
      usuario_id: usuarioId,
      exitoso,
      ip: meta.ip || null,
      user_agent: meta.userAgent || null,
    });
  } catch (err) {
    console.error('[historial-acceso] No se pudo registrar el acceso:', err.message);
  }
}

module.exports = {
  extraerMeta,
  registrar,
};
