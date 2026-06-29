module.exports = (sequelize) => {
  const EventoCategoria = sequelize.define(
    'EventoCategoria',
    {},
    {
      tableName: 'EventoCategorias',
      timestamps: false,
    }
  );

  return EventoCategoria;
};