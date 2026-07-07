const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const valoracionController = require('../controllers/valoracion.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const validacionGuardar = [
  body('evento_id').isUUID().withMessage('evento_id debe ser un UUID válido'),
  body('puntuacion')
    .isInt({ min: 1, max: 5 })
    .withMessage('La puntuación debe ser un entero entre 1 y 5'),
  body('comentario')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El comentario no debe superar los 500 caracteres'),
  validate,
];

const validacionEventoId = [
  param('eventoId').isUUID().withMessage('eventoId debe ser un UUID válido'),
  validate,
];

router.use(authMiddleware);

router.post('/', validacionGuardar, valoracionController.guardar);
router.get('/evento/:eventoId', validacionEventoId, valoracionController.miValoracion);

module.exports = {
  prefix: '/valoraciones',
  router,
};
