const express = require('express');
const router = express.Router();

const eventoController = require('../controllers/evento.controller');

router.get('/', eventoController.listar);

router.get('/:id', eventoController.obtenerPorId);



router.post('/', eventoController.crear);

router.put('/:id', eventoController.actualizar);

module.exports = router;