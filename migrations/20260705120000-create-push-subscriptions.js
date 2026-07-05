'use strict';

// T-13: tabla para guardar las suscripciones Web Push de cada usuario.
// Cuando el navegador acepta notificaciones, nos manda endpoint + keys y los persistimos acá.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PushSubscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      keys: {
        // El navegador manda { p256dh, auth } — los guardamos como JSON
        type: Sequelize.JSONB,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('PushSubscriptions', ['usuario_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PushSubscriptions');
  },
};
