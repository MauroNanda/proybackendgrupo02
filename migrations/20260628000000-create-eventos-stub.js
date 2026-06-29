'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists('Eventos');
    if (!tableExists) {
      await queryInterface.createTable('Eventos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        titulo: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        cupo_maximo: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        estado: {
          type: Sequelize.ENUM('BORRADOR', 'PUBLICADO', 'CANCELADO'),
          defaultValue: 'BORRADOR',
          allowNull: false,
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
    await queryInterface.dropTable('Eventos');
    // Drop the ENUM type if needed
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Eventos_estado";');
    } catch {
      // Ignorar si no se puede borrar o no existe
    }
  },
};
