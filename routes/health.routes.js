const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');

// GET /api/health
// Endpoint de smoke test. Devuelve estado del servidor y conectividad con la BD.
// Lo usa el frontend en su página demo para validar que la integración funciona.
router.get('/', async (_req, res) => {
  let dbStatus = 'down';
  try {
    await sequelize.authenticate();
    dbStatus = 'up';
  } catch (err) {
    // No tiramos el endpoint si la BD está caída — informamos el estado real.
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
