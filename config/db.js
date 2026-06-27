const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en el entorno. Verificá tu .env.');
}

// Conexión Sequelize a la base de datos Postgres en Neon.tech.
// SSL es obligatorio en Neon — por eso pasamos dialectOptions.ssl.require = true.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  define: {
    underscored: false,
    timestamps: true,
  },
});

module.exports = sequelize;
