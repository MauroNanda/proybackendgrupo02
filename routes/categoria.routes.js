const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const controller = require('../controllers/categoria.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const validationSchema = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no debe superar los 100 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('La descripción no debe superar los 255 caracteres'),
  validate,
];

router.get('/', controller.listar);
router.post('/', authMiddleware, roleMiddleware(['ORGANIZADOR']), validationSchema, controller.crear);
router.put('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), validationSchema, controller.editar);
router.delete('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), controller.eliminar);

module.exports = router;