'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Auditoria', {
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
          model: 'Usuarios', // Asegurate de que coincida con el nombre de tu tabla de Usuarios
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // Protege el registro de auditoría si se elimina el usuario
      },
      accion: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entidad: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entidad_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      detalle: {
        type: Sequelize.JSONB, // JSONB es ideal en Postgres/Neon para guardar JSON indexable
        allowNull: true
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      // Si usás los timestamps estándar de Sequelize por defecto, dejalos; 
      // si solo usás created_at de forma manual, podés remover el updatedAt.
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Auditoria');
  }
};