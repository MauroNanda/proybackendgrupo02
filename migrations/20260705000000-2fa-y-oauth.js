'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Usuarios', 'codigo_2fa', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Usuarios', 'codigo_2fa_expira', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.changeColumn('Usuarios', 'two_factor_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Usuarios', 'codigo_2fa');
    await queryInterface.removeColumn('Usuarios', 'codigo_2fa_expira');
    await queryInterface.changeColumn('Usuarios', 'two_factor_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
  }
};
