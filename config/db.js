const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en el entorno. Verificá tu .env.');
}

// Conexión Sequelize a la base de datos Postgres local en Docker.
// Se desactiva la exigencia de SSL para el entorno de laboratorio.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: false,
  },
  define: {
    underscored: false,
    timestamps: true,
  },
});

module.exports = sequelize;
