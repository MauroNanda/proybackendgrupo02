const { DataTypes } = require('sequelize');

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
      username: {
        type: DataTypes.STRING(60),
        allowNull: true,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      rol: {
        type: DataTypes.ENUM('ORGANIZADOR', 'ASISTENTE'),
        allowNull: false,
        defaultValue: 'ASISTENTE',
      },
      google_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      telegram_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'Usuarios',
      defaultScope: {
        attributes: {
          exclude: ['password'],
        },
      },
      scopes: {
        conPassword: {
          attributes: { include: ['password'] },
        },
      },
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
