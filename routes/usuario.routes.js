const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const validate = require('../middlewares/validate.middleware');

// Validaciones
const validacionId = [
  param('id').isUUID().withMessage('El ID debe ser un UUID válido'),
  validate,
];

const validacionCrear = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('email')
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  validate,
];

const validacionActualizar = [
  ...validacionId,
  body('nombre')
    .optional()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('email')
    .optional()
    .notEmpty().withMessage('El correo electrónico no puede estar vacío')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  validate,
];

// Rutas CRUD
router.get('/', usuarioController.obtenerTodos);
router.get('/:id', validacionId, usuarioController.obtenerPorId);
router.post('/', validacionCrear, usuarioController.crear);
router.put('/:id', validacionActualizar, usuarioController.actualizar);
router.delete('/:id', validacionId, usuarioController.eliminar);

module.exports = router;
