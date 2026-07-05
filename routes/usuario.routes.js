const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Validaciones
const validacionId = [
  param('id').isUUID().withMessage('El ID debe ser un UUID válido'),
  validate,
];

const validacionCrear = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  body('rol')
    .optional()
    .isIn(['ORGANIZADOR', 'ASISTENTE']).withMessage('El rol debe ser ORGANIZADOR o ASISTENTE'),
  validate,
];

const validacionActualizar = [
  ...validacionId,
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('El correo electrónico no puede estar vacío')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  body('rol')
    .optional()
    .isIn(['ORGANIZADOR', 'ASISTENTE']).withMessage('El rol debe ser ORGANIZADOR o ASISTENTE'),
  validate,
];

// Rutas CRUD
router.get('/', usuarioController.obtenerTodos);
router.get('/:id', validacionId, usuarioController.obtenerPorId);
router.post('/', validacionCrear, usuarioController.crear);
router.put('/:id', validacionActualizar, usuarioController.actualizar);
router.delete('/:id', validacionId, usuarioController.eliminar);

module.exports = router;
