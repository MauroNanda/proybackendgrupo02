const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const controller = require('../controllers/notificacion.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

const validationSchemaId = [
  param('id').isUUID().withMessage('El id de notificación debe ser un UUID válido'),
  validate,
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', controller.obtenerPorUsuario);
router.put('/leer-todas', controller.marcarTodasComoLeidas);
router.put('/:id/leida', validationSchemaId, controller.marcarComoLeida);

module.exports = {
  prefix: '/notificaciones',
  router
};
