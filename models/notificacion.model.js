'use strict';

const { Model } = require('sequelize');
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Notificacion extends Model {
        static associate(models) {
            Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
        }
    }

    Notificacion.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        usuario_id: {
            type: DataTypes.INTEGER, // O UUID, dependiendo de cómo sea el ID de tu tabla Usuario
            allowNull: false
        },
        titulo: DataTypes.STRING,
        mensaje: DataTypes.TEXT,
        leida: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        tipo: {
            type: DataTypes.ENUM('INSCRIPCION', 'RECORDATORIO', 'CUPO_LIBERADO', 'EVENTO_NUEVO'),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Notificacion',
        tableName: 'Notificaciones',
        freezeTableName: true
    });


    return Notificacion;
};