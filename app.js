require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const sequelize = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/error-handler.middleware');
const sanitize = require('./middlewares/sanitize.middleware');
const { securityDetector } = require('./middlewares/security-detector.middleware');
const { apiLimiter } = require('./middlewares/rate-limit.middleware');
const registrarIntegraciones = require('./integrations/register');
const recordatoriosJob = require('./jobs/recordatorios.job');

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

app.set('trust proxy', 1);

// ===== Middlewares base =====
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(securityDetector);
app.use(sanitize);

// ===== Rutas =====
app.use('/api', apiLimiter, routes);

// ===== 404 =====
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Recurso no encontrado' } });
});

// ===== Error handler (debe ir al final) =====
app.use(errorHandler);

// ===== Validación de variables de entorno requeridas =====
function validarEnv() {
  const requeridas = ['DATABASE_URL', 'JWT_SECRET'];
  const faltantes = requeridas.filter((clave) => !process.env[clave]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${faltantes.join(', ')}. ` +
      'Definilas en el archivo .env (ver .env.example).'
    );
  }

  const secretosInseguros = new Set([
    'cambiame-por-un-secreto-largo-y-aleatorio',
    'convoca-dev-secret-inseguro-no-usar-en-prod',
  ]);
  if (process.env.JWT_SECRET.length < 32 || secretosInseguros.has(process.env.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET es débil o usa un valor por defecto. Generá uno aleatorio de al menos 32 caracteres.'
    );
  }
}

// ===== Arranque del servidor =====
async function start() {
  try {
    validarEnv();

    await sequelize.authenticate();
    console.log('[DB] Conexión con PostgreSQL establecida.');

    registrarIntegraciones();
    recordatoriosJob.iniciar();

    app.listen(PORT, () => {
      console.log(`[Convoca API] Servidor corriendo en http://localhost:${PORT}`);
      console.log(`[Convoca API] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[FATAL] No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;