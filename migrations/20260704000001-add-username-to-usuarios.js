'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Usuarios', 'username', {
      type: Sequelize.STRING(60),
      allowNull: true,
      unique: true,
      after: 'nombre',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Usuarios', 'username');
  },
};
