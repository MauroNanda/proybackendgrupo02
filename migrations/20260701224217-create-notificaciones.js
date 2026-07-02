'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Notificaciones', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' }
      },
      titulo: { type: Sequelize.STRING },
      mensaje: { type: Sequelize.TEXT },
      leida: { type: Sequelize.BOOLEAN, defaultValue: false },
      tipo: {
        type: Sequelize.ENUM('INSCRIPCION', 'RECORDATORIO', 'CUPO_LIBERADO', 'EVENTO_NUEVO'),
        allowNull: false
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Notificaciones');
  }
};
