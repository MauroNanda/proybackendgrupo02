require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const sequelize = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/error-handler.middleware');
const sanitize = require('./middlewares/sanitize.middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

// ===== Middlewares base =====
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);

// ===== Rutas =====
app.use('/api', routes);

// ===== 404 =====
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Recurso no encontrado' } });
});

// ===== Error handler (debe ir al final) =====
app.use(errorHandler);

// ===== Validación de variables de entorno requeridas =====
function validarEnv() {
  // DATABASE_URL siempre es obligatoria. JWT_SECRET solo es obligatoria en
  // producción; en desarrollo hay un secreto de respaldo (ver jwt.util.js).
  const requeridas = ['DATABASE_URL'];
  if (process.env.NODE_ENV === 'production') {
    requeridas.push('JWT_SECRET');
  }
  const faltantes = requeridas.filter((clave) => !process.env[clave]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${faltantes.join(', ')}. ` +
      'Definilas en el archivo .env (ver .env.example).'
    );
  }
}

// ===== Arranque del servidor =====
async function start() {
  try {
    validarEnv();

    await sequelize.authenticate();
    console.log('[DB] Conexión con Neon.tech establecida.');

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
