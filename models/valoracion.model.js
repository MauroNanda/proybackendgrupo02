const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Valoracion = sequelize.define('Valoracion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Usuarios', key: 'id' }
    },
    evento_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Eventos', key: 'id' }
    },
    puntuacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Valoracion',
    timestamps: false
  });
// Relaciones leídas por el index.js
  Valoracion.associate = (models) => {
    Valoracion.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
    Valoracion.belongsTo(models.Evento, {
      foreignKey: 'evento_id',
      as: 'evento'
    });
  };

  return Valoracion;
};