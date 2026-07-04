const express = require('express');
const router = express.Router();

const eventoController = require('../controllers/evento.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.get('/', eventoController.listar);
router.get('/:id', eventoController.obtenerPorId);

router.post('/', authMiddleware, roleMiddleware(['ORGANIZADOR']), eventoController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), eventoController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ORGANIZADOR']), eventoController.eliminar);

module.exports = router;