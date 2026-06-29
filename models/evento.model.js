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
        defaultValue: 'BORRADOR',
        allowNull: false,
      },
    },
    {
      tableName: 'Eventos',
    }
  );

  Evento.associate = (models) => {
    Evento.belongsToMany(models.Categoria, {
      through: models.EventoCategoria,
      foreignKey: 'eventoId',
      otherKey: 'categoriaId',
    });
    Evento.hasMany(models.Inscripcion, {
      foreignKey: 'eventoId',
      as: 'inscripciones',
    });
  };

  return Evento;
};
