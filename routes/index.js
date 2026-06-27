const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');

const usuarioRoutes = require('./usuario.routes');

// Router central — todas las rutas se montan acá bajo el prefijo /api.
// Cada nueva tarea agrega su línea de `router.use(...)` al final.
router.use('/health', healthRoutes);
router.use('/usuarios', usuarioRoutes);

module.exports = router;
