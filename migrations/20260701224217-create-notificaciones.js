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
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

  async down (queryInterface) {
    await queryInterface.dropTable('Notificaciones');
  }
};
