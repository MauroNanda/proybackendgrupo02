const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const inscripcionController = require('../controllers/inscripcion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const validacionInscribirse = [
  body('eventoId').isUUID().withMessage('El eventoId debe ser un UUID válido'),
  validate,
];

const validacionCancelar = [
  param('eventoId').isUUID().withMessage('El eventoId debe ser un UUID válido'),
  validate,
];

const validacionEstado = [
  param('eventoId').isUUID().withMessage('El eventoId debe ser un UUID válido'),
  validate,
];

const validacionCheckIn = [
  body('qr_token').isUUID().withMessage('El qr_token debe ser un UUID válido'),
  validate,
];

// Todas las rutas de inscripciones requieren autenticación
router.use(authMiddleware);

router.post('/', validacionInscribirse, inscripcionController.inscribirse);
router.delete('/:eventoId', validacionCancelar, inscripcionController.cancelar);
router.get('/estado/:eventoId', validacionEstado, inscripcionController.obtenerEstado);
router.post('/check-in', validacionCheckIn, inscripcionController.checkIn);

module.exports = {
  prefix: '/inscripciones',
  router,
};
