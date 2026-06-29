const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventoCategoria = sequelize.define(
    'EventoCategoria',
    {
      eventoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      categoriaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'EventoCategorias',
      timestamps: false,
    }
  );

  return EventoCategoria;
};