const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categoria = sequelize.define(
    'Categoria',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      nombre: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'Categorias',
    }
  );
  Categoria.associate = (db) => {
  Categoria.belongsToMany(db.Evento, {
    through: db.EventoCategoria,
    foreignKey: 'categoriaId',
    otherKey: 'eventoId',
  });
};
  return Categoria;
};