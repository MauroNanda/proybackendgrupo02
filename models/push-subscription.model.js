const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushSubscription = sequelize.define(
    'PushSubscription',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      keys: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      tableName: 'PushSubscriptions',
    }
  );

  // Un usuario puede tener más de una suscripción (ej. Chrome en la PC y en el celular)
  PushSubscription.associate = (models) => {
    PushSubscription.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });
  };

  return PushSubscription;
};
