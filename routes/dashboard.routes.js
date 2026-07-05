const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Solo los organizadores tienen acceso al panel administrativo
router.use(authMiddleware);
router.use(roleMiddleware(['ORGANIZADOR']));

router.get('/kpis', dashboardController.kpis);
router.get('/charts', dashboardController.charts);

// Exportamos con prefijo explícito para que el autoloader monte en /api/dashboard
module.exports = { prefix: '/dashboard', router };
