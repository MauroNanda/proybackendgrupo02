const { DataTypes } = require('sequelize');

// Modelo Usuario — versión inicial (Fase 0).
// Solo contiene los campos mínimos para validar el flujo Sequelize end-to-end.
// La extensión completa (password, rol, google_id, telegram_id, 2FA, etc.)
// se hace en la tarea T-01-1 del PLAN-DE-TAREAS.
module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nombre: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
    },
    {
      tableName: 'Usuarios',
    }
  );

  Usuario.associate = (models) => {
    Usuario.hasMany(models.Inscripcion, {
      foreignKey: 'usuarioId',
      as: 'inscripciones',
    });
  };

  return Usuario;
};
