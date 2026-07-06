const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pushController = require('../controllers/push.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const validacionSubscribe = [
  body('endpoint').notEmpty().withMessage('El endpoint es obligatorio'),
  body('keys.p256dh').notEmpty().withMessage('La clave p256dh es obligatoria'),
  body('keys.auth').notEmpty().withMessage('La clave auth es obligatoria'),
  validate,
];

// La clave pública no requiere login (solo sirve para suscribirse)
router.get('/vapid-public-key', pushController.clavePublica);

// Guardar suscripción: el usuario tiene que estar logueado
router.post('/subscribe', authMiddleware, validacionSubscribe, pushController.subscribe);

module.exports = { prefix: '/push', router };
