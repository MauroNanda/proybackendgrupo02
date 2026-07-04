const db = require('../models');

const getAll = async () => await db.Categoria.findAll();

const create = async (data) => await db.Categoria.create(data);

const update = async (id, data) => {
    return await db.Categoria.update(data, { where: { id } });
};

const remove = async (id) => {
    return await db.Categoria.destroy({ where: { id } });
};

module.exports = { getAll, create, update, remove };