const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inscripcion = sequelize.define(
    'Inscripcion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuarioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      eventoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM('CONFIRMADO', 'ESPERA', 'CANCELADO', 'ASISTIO'),
        defaultValue: 'CONFIRMADO',
        allowNull: false,
      },
      qr_token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'Inscripciones',
      indexes: [
        { name: 'idx_inscripciones_evento_estado', fields: ['eventoId', 'estado'] },
        { name: 'idx_inscripciones_usuario', fields: ['usuarioId'] },
      ],
    }
  );

  Inscripcion.associate = (models) => {
    Inscripcion.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
    });
    Inscripcion.belongsTo(models.Evento, {
      foreignKey: 'eventoId',
      as: 'evento',
    });
  };

  return Inscripcion;
};
