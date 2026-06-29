const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Evento = sequelize.define(
    'Evento',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },

      descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      ubicacion: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },

      cupo_maximo: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      estado: {
        type: DataTypes.ENUM('BORRADOR', 'PUBLICADO', 'CANCELADO'),
        defaultValue: 'PUBLICADO',
      },
    },
    {
      tableName: 'Eventos',
    }
  );

Evento.associate = (db) => {
  Evento.belongsToMany(db.Categoria, {
    through: db.EventoCategoria,
    foreignKey: 'eventoId',
    otherKey: 'categoriaId',
  });
};



  return Evento;
};