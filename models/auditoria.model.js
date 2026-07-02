module.exports = (sequelize, DataTypes) => {
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
      defaultValue: DataTypes.NOW,
      field: 'created_at' // Fuerza a Sequelize a usar snake_case en la BD
    }
  }, {
    tableName: 'AuditoriaAccion',
    timestamps: true // Mantiene el manejo automático de fechas de Sequelize
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