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
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      cupo_maximo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    Evento.hasMany(models.Inscripcion, {
      foreignKey: 'eventoId',
      as: 'inscripciones',
    });
  };

  return Evento;
};
