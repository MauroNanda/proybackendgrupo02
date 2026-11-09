require('dotenv').config();
const { postgresOptions } = require('./postgres-options');
const connection = postgresOptions();

const baseConfig = {
  url: connection.url,
  dialect: 'postgres',
  dialectOptions: connection.dialectOptions,
};

module.exports = {
  development: baseConfig,
  test: baseConfig,
  production: baseConfig,
};
