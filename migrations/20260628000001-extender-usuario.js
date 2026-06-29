'use strict';

// T-01: extiende Usuarios con campos de autenticación y perfil.
// Campos OAuth/2FA se crean acá para dejar la BD lista; la lógica llega en Fase 3.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Usuarios', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('Usuarios', 'rol', {
      type: Sequelize.ENUM('ORGANIZADOR', 'ASISTENTE'),
      allowNull: false,
      defaultValue: 'ASISTENTE',
    });

    await queryInterface.addColumn('Usuarios', 'google_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('Usuarios', 'telegram_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('Usuarios', 'two_factor_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn('Usuarios', 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Usuarios', 'avatar_url');
    await queryInterface.removeColumn('Usuarios', 'two_factor_enabled');
    await queryInterface.removeColumn('Usuarios', 'telegram_id');
    await queryInterface.removeColumn('Usuarios', 'google_id');
    await queryInterface.removeColumn('Usuarios', 'rol');
    await queryInterface.removeColumn('Usuarios', 'password');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Usuarios_rol";');
  },
};
