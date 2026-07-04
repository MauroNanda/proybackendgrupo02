const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoria.controller');

router.get('/', controller.listar);
router.post('/', controller.crear);
router.put('/:id', controller.editar);
router.delete('/:id', controller.eliminar);

module.exports = router;