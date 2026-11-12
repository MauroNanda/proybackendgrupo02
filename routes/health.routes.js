const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');

// GET /api/health
// Endpoint de health check. Valida el estado del servidor y la conectividad real con PostgreSQL.
router.get('/', async (_req, res) => {
  let dbStatus = 'down';
  try {
    await sequelize.authenticate();
    dbStatus = 'up'; // Cambia a 'up' solo si la conexión es exitosa
  } catch (err) {
    dbStatus = `error: ${err.message}`; // Informa el error real si la base está caída
  }

  res.json({
    commit: process.env.GIT_COMMIT || '5b85c4c2fcf5d32d4f68aaef345c53096359b2f1',
    status: 'ok',
    database: dbStatus, // Reflejará 'up' o 'error/down' dinámicamente
    version: process.env.APP_VERSION || '11.1.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;