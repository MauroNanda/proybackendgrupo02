// 1. Importamos el modelo correcto según tu nueva estructura
const { AuditoriaAccion } = require('../models');

const auditMiddleware = (entidadAfectada) => {
  return async (req, res, next) => {
    // Verificar si el usuario está autenticado
    if (!req.user || !req.user.id) {
      return next();
    }

    // 2. Mapeamos el método HTTP a un prefijo de acción en español e infinitivo/imperativo
    let prefijoAccion = null;
    if (req.method === 'POST') prefijoAccion = 'CREAR';
    if (['PUT', 'PATCH'].includes(req.method)) prefijoAccion = 'ACTUALIZAR';
    if (req.method === 'DELETE') prefijoAccion = 'ELIMINAR';

    // Si es un GET o un método que no muta datos, no auditamos
    if (!prefijoAccion) return next();

    // 3. Interceptamos la finalización de la respuesta HTTP
    res.on('finish', async () => {
      // Solo auditamos si la operación en el controlador fue exitosa (Status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Intentamos capturar el UUID del recurso afectado
          const recursoId = req.params.id || req.body.id || null;

          // Limpiamos datos sensibles del body antes de guardarlo en "detalle"
          const detallesAuditoria = { ...req.body };
          delete detallesAuditoria.password;
          delete detallesAuditoria.token;
          delete detallesAuditoria.token2FA;

          // Armamos el string de la acción (Ej: "CREAR_EVENTO", "ELIMINAR_INSCRIPCION")
          const accionFinal = `${prefijoAccion}_${entidadAfectada.toUpperCase()}`;

          // Capturamos la IP de forma segura contemplando proxies (como el de Neon o producción)
          const ipCliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

          // 4. Guardamos en la base de datos usando el modelo y campos nuevos
          await AuditoriaAccion.create({
            usuario_id: req.user.id,
            accion: accionFinal,
            entidad: entidadAfectada, // ej: "Evento", "Inscripcion"
            entidad_id: recursoId,
            detalle: detallesAuditoria,
            ip: ipCliente
          });
        } catch (error) {
          console.error('Error crítico al registrar la acción en AuditoriaAccion:', error);
        }
      }
    });

    next();
  };
};

module.exports = auditMiddleware;