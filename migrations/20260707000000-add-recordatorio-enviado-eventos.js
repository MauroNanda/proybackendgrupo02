'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Marca de idempotencia del recordatorio 24h: NULL = pendiente,
    // timestamp = ya enviado (y cuándo). La setea el job de recordatorios.
    await queryInterface.addColumn('Eventos', 'recordatorio_enviado_en', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Eventos', 'recordatorio_enviado_en');
  },
};
