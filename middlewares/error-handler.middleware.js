// Middleware central de manejo de errores.
// Express identifica este middleware por su firma (err, req, res, next).
// Debe ser el ÚLTIMO middleware registrado en app.js.

/**
 * Traduce errores conocidos de Sequelize a un status HTTP semántico con
 * mensaje genérico (nunca el detalle crudo de la DB, que puede filtrar
 * nombres de tablas, constraints o valores). Devuelve null si no aplica.
 */
function mapearErrorSequelize(err) {
  switch (err.name) {
    case 'SequelizeUniqueConstraintError':
      // Violación de índice único → conflicto con un recurso existente.
      return { status: 409, message: 'Ya existe un registro con esos datos' };

    case 'SequelizeValidationError':
      // Incluye notNull y validaciones del modelo. Estos mensajes los
      // definimos nosotros en los modelos, así que son seguros de exponer
      // y le sirven al cliente para corregir el request.
      return {
        status: 400,
        message: err.errors?.map((e) => e.message).join('. ') || 'Datos inválidos',
      };

    case 'SequelizeForeignKeyConstraintError':
      // FK hacia un registro inexistente, o borrado de uno referenciado.
      return { status: 409, message: 'La operación referencia datos inexistentes o en uso' };

    case 'SequelizeDatabaseError':
      // UUID mal formado en un parámetro de ruta (ej: /eventos/abc):
      // es un error del cliente, no del servidor.
      if (/invalid input syntax for type uuid/i.test(err.original?.message || err.message)) {
        return { status: 400, message: 'Identificador con formato inválido' };
      }
      return null; // otros errores de DB sí son 500 legítimos

    default:
      return null;
  }
}

function errorHandler(err, _req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Loguear siempre el error original completo (acá sí con detalle de DB).
  // En producción podría enviarse a un servicio externo.
  console.error('[ERROR]', err);

  // 1. Errores de Sequelize → status semántico con mensaje genérico.
  const mapeado = mapearErrorSequelize(err);
  if (mapeado) {
    return res.status(mapeado.status).json({
      error: {
        message: mapeado.message,
        // En desarrollo exponemos el stack para facilitar debug. En producción NO.
        ...(isProd ? {} : { stack: err.stack }),
      },
    });
  }

  // 2. HttpError propio (trae status) o fallback a 500.
  const status = err.status || err.statusCode || 500;
  // Un 500 en producción nunca expone err.message: puede traer detalle interno.
  const message = status >= 500 && isProd
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(status).json({
    error: {
      message,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
