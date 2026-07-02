const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditoriaAccion = sequelize.define('AuditoriaAccion', {
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
    accion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entidad: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entidad_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    detalle: {
      type: DataTypes.JSONB, // Mapea directo al JSONB de la migración
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Auditoria',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updatedAt'
  });
// Este bloque lo lee automáticamente tu index.js
  AuditoriaAccion.associate = (models) => {
    AuditoriaAccion.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  };

  return AuditoriaAccion;
};