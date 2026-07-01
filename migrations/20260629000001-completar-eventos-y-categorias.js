'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear tabla Categorias
    await queryInterface.createTable('Categorias', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      nombre: {
        type: Sequelize.STRING(120),
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

    // 2. Crear tabla EventoCategorias (tabla intermedia)
    await queryInterface.createTable('EventoCategorias', {
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
      categoriaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Categorias',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    // 3. Completar columnas faltantes en Eventos (por si ya se creó mediante el stub en T-03)
    const tableDesc = await queryInterface.describeTable('Eventos');

    if (!tableDesc.descripcion) {
      await queryInterface.addColumn('Eventos', 'descripcion', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
    if (!tableDesc.fecha) {
      await queryInterface.addColumn('Eventos', 'fecha', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!tableDesc.ubicacion) {
      await queryInterface.addColumn('Eventos', 'ubicacion', {
        type: Sequelize.STRING(200),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EventoCategorias');
    await queryInterface.dropTable('Categorias');

    // Remover columnas agregadas en up
    const tableDesc = await queryInterface.describeTable('Eventos');
    if (tableDesc.descripcion) {
      await queryInterface.removeColumn('Eventos', 'descripcion');
    }
    if (tableDesc.fecha) {
      await queryInterface.removeColumn('Eventos', 'fecha');
    }
    if (tableDesc.ubicacion) {
      await queryInterface.removeColumn('Eventos', 'ubicacion');
    }
  },
};
