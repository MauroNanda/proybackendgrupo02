const db = require('../models');

const getAll = async () => await db.Categoria.findAll({
  include: [
    {
      model: db.Evento,
      through: { attributes: [] },
      attributes: ['id', 'titulo'],
    },
  ],
  order: [['nombre', 'ASC']],
});

const create = async (data) => await db.Categoria.create(data);

const update = async (id, data) => {
  const categoria = await db.Categoria.findByPk(id);
  if (!categoria) {
    throw new Error('Categoría no encontrada');
  }
  await categoria.update(data);
  return categoria;
};

const remove = async (id) => {
  const categoria = await db.Categoria.findByPk(id);
  if (!categoria) {
    throw new Error('Categoría no encontrada');
  }
  await categoria.destroy();
  return true;
};

module.exports = { getAll, create, update, remove };