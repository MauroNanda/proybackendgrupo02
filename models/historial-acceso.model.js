module.exports = (sequelize, DataTypes) => {
  const HistorialAcceso = sequelize.define('HistorialAcceso', {
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
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_agent'
    },
    exitoso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'HistorialAcceso',
    timestamps: true
  });
// Relación leída por el index.js
  HistorialAcceso.associate = (models) => {
    HistorialAcceso.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  };

  return HistorialAcceso;
};