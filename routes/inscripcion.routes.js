const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const inscripcionController = require('../controllers/inscripcion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');
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

router.get('/mis-inscripciones', inscripcionController.obtenerMisInscripciones);

router.post('/', validacionInscribirse, auditMiddleware('Inscripcion'), inscripcionController.inscribirse);
router.delete('/:eventoId', validacionCancelar, auditMiddleware('Inscripcion'), inscripcionController.cancelar);
router.get('/estado/:eventoId', validacionEstado, inscripcionController.obtenerEstado);
router.post('/check-in', validacionCheckIn, inscripcionController.checkIn);

// Rutas de administración de inscripciones (solo ORGANIZADOR)
router.get(
  '/evento/:eventoId',
  roleMiddleware(['ORGANIZADOR']),
  [param('eventoId').isUUID().withMessage('El eventoId debe ser un UUID válido'), validate],
  inscripcionController.obtenerInscriptosPorEvento
);
router.post(
  '/:id/check-in-manual',
  roleMiddleware(['ORGANIZADOR']),
  auditMiddleware('Inscripcion'),
  [param('id').isUUID().withMessage('El id de inscripción debe ser un UUID válido'), validate],
  inscripcionController.checkInManual
);

module.exports = {
  prefix: '/inscripciones',
  router,
};
