const service = require('../services/categoria.service');

const listar = async (req, res, next) => {
  try {
    res.json(await service.getAll());
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    res.status(201).json(await service.create(req.body));
  } catch (err) {
    next(err);
  }
};

const editar = async (req, res, next) => {
  try {
    const categoria = await service.update(req.params.id, req.body);
    res.json(categoria);
  } catch (err) {
    if (err.message === 'Categoría no encontrada') {
      res.status(404).json({ mensaje: err.message });
    } else {
      next(err);
    }
  }
};

const eliminar = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    if (err.message === 'Categoría no encontrada') {
      res.status(404).json({ mensaje: err.message });
    } else {
      next(err);
    }
  }
};

module.exports = { listar, crear, editar, eliminar };