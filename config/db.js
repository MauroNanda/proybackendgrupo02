const { Sequelize } = require('sequelize');
const { postgresOptions } = require('./postgres-options');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en el entorno. Verificá tu .env.');
}

// TLS local/remoto compartido con las migraciones; Neon conserva certificados válidos.
const connection = postgresOptions();
const sequelize = new Sequelize(connection.url, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: connection.dialectOptions,
  define: {
    underscored: false,
    timestamps: true,
  },
});

module.exports = sequelize;
