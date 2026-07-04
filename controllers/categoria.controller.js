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
        const [updated] = await service.update(req.params.id, req.body);
        if (updated) 
            res.json({ message: 'Actualizado' });
        else 
            res.status(404).json({ message: 'No encontrado' });
    } catch (err) { 
        next(err); 
    }
};

const eliminar = async (req, res, next) => {
    try {
        const deleted = await service.remove(req.params.id);
        if (deleted) 
            res.json({ message: 'Eliminado' });
        else 
            res.status(404).json({ message: 'No encontrado' });
    } catch (err) { 
        next(err); 
    }
};

module.exports = { listar, crear, editar, eliminar };