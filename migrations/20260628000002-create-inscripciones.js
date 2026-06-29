'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists('Inscripciones');
    if (!tableExists) {
      await queryInterface.createTable('Inscripciones', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        usuarioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Usuarios',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        eventoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Eventos',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        estado: {
          type: Sequelize.ENUM('CONFIRMADO', 'ESPERA', 'CANCELADO', 'ASISTIO'),
          defaultValue: 'CONFIRMADO',
          allowNull: false,
        },
        qr_token: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          unique: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Inscripciones');
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Inscripciones_estado";');
    } catch {
      // Ignorar si no se puede borrar o no existe
    }
  },
};
