const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const eventoController = require('../controllers/evento.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');
const validate = require('../middlewares/validate.middleware');

const validacionId = [
  param('id').isUUID().withMessage('El ID debe ser un UUID válido'),
  validate,
];

const validacionCrear = [
  body('titulo')
    .trim()
    .notEmpty().withMessage('El título es obligatorio')
    .isLength({ max: 200 }).withMessage('El título no debe superar los 200 caracteres'),
  body('descripcion')
    .optional()
    .trim(),
  body('ubicacion')
    .trim()
    .notEmpty().withMessage('La ubicación es obligatoria')
    .isLength({ max: 200 }).withMessage('La ubicación no debe superar los 200 caracteres'),
  body('fecha')
    .notEmpty().withMessage('La fecha es obligatoria')
    .isISO8601().withMessage('La fecha debe tener un formato válido')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('La fecha del evento debe ser en el futuro');
      }
      return true;
    }),
  body('cupo_maximo')
    .isInt({ min: 1 }).withMessage('El cupo máximo debe ser un entero mayor o igual a 1'),
  body('estado')
    .optional()
    .isIn(['BORRADOR', 'PUBLICADO', 'CANCELADO']).withMessage('Estado inválido'),
  validate,
];

const validacionActualizar = [
  param('id').isUUID().withMessage('El ID debe ser un UUID válido'),
  body('titulo')
    .optional()
    .trim()
    .notEmpty().withMessage('El título no puede estar vacío')
    .isLength({ max: 200 }).withMessage('El título no debe superar los 200 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .notEmpty().withMessage('La descripción no puede estar vacía'),
  body('ubicacion')
    .optional()
    .trim()
    .notEmpty().withMessage('La ubicación no puede estar vacía')
    .isLength({ max: 200 }).withMessage('La ubicación no debe superar los 200 caracteres'),
  body('fecha')
    .optional()
    .isISO8601().withMessage('La fecha debe tener un formato válido')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('La fecha del evento debe ser en el futuro');
      }
      return true;
    }),
  body('cupo_maximo')
    .optional()
    .isInt({ min: 1 }).withMessage('El cupo máximo debe ser un entero mayor o igual a 1'),
  body('estado')
    .optional()
    .isIn(['BORRADOR', 'PUBLICADO', 'CANCELADO']).withMessage('Estado inválido'),
  validate,
];

router.get('/', eventoController.listar);
router.get('/:id', validacionId, eventoController.obtenerPorId);

router.post('/', authMiddleware, roleMiddleware(['ORGANIZADOR']), auditMiddleware('Evento'), validacionCrear, eventoController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), auditMiddleware('Evento'), validacionActualizar, eventoController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), auditMiddleware('Evento'), validacionId, eventoController.eliminar);

module.exports = router;