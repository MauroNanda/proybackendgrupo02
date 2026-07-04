const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

const validacionRegistro = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('username')
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 60 }).withMessage('El usuario debe tener entre 3 y 60 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Solo letras, números y guiones bajos'),
  body('email')
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('rol')
    .optional()
    .isIn(['ORGANIZADOR', 'ASISTENTE']).withMessage('El rol debe ser ORGANIZADOR o ASISTENTE'),
  validate,
];

const validacionLogin = [
  body('username')
    .notEmpty().withMessage('El usuario es obligatorio')
    .isLength({ max: 160 }).withMessage('El usuario no debe superar los 160 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),
  validate,
];

router.post('/registro', validacionRegistro, authController.registro);
router.post('/login', validacionLogin, authController.login);
router.get('/perfil', authMiddleware, authController.perfil);

module.exports = router;
