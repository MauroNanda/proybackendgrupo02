'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Valoracion', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Usuarios', // Asegurate de que coincida con el nombre real de la tabla de usuarios
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      evento_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Eventos', // Asegurate de que coincida con el nombre real de la tabla de eventos
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      puntuacion: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      comentario: {
        type: Sequelize.TEXT,
        allowNull: true
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Valoracion');
  }
};