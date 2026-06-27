const { validationResult } = require('express-validator');

/**
 * Middleware para procesar los errores de validación de express-validator.
 * Debe colocarse inmediatamente después de la cadena de validaciones en la ruta.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Error de validación en los datos provistos',
        details: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
          location: err.location,
        })),
      },
    });
  }
  next();
}

module.exports = validate;
