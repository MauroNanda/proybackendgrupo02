const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginLimiter, registroLimiter, codigo2faLimiter } = require('../middlewares/rate-limit.middleware');

const validacionRegistro = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no debe superar los 120 caracteres'),
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 60 }).withMessage('El usuario debe tener entre 3 y 60 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Solo letras, números y guiones bajos'),
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe proveer un correo electrónico válido')
    .isLength({ max: 160 }).withMessage('El correo electrónico no debe superar los 160 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  // `rol` se ignora a propósito: el registro público siempre crea ASISTENTE
  // (la promoción a ORGANIZADOR va por un endpoint protegido para admins).
  validate,
];

const validacionLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('El usuario es obligatorio')
    .isLength({ max: 160 }).withMessage('El usuario no debe superar los 160 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),
  validate,
];

router.post('/registro', registroLimiter, validacionRegistro, authController.registro);
router.post('/login', loginLimiter, validacionLogin, authController.login);
router.get('/perfil', authMiddleware, authController.perfil);

// Rutas para Google OAuth
router.get('/google', authController.redirigirGoogle);
router.get('/google/callback', authController.callbackGoogle);

// Ruta para verificar el 2FA (con limiter anti-fuerza bruta del código).
router.post('/2fa/verify', codigo2faLimiter, [
  body('email').isEmail().withMessage('Debe proveer un correo válido'),
  body('codigo').isLength({ min: 6, max: 6 }).withMessage('El código debe tener 6 dígitos'),
  validate
], authController.verificar2FA);

// Ruta para habilitar/deshabilitar 2FA (protegida por autenticación)
router.post('/2fa/config', authMiddleware, authController.configurar2FA);

module.exports = router;
