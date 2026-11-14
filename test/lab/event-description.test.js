'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Evento } = require('../../models');
const eventoService = require('../../services/evento.service');

test('crear evento sin descripcion guarda cadena vacia porque es opcional', async (t) => {
  const originalCreate = Evento.create;
  const originalFindByPk = Evento.findByPk;
  let created;

  t.after(() => {
    Evento.create = originalCreate;
    Evento.findByPk = originalFindByPk;
  });

  Evento.create = async (data) => {
    created = { id: 'a11-evento-de-prueba', ...data };
    return created;
  };
  Evento.findByPk = async () => ({ ...created, categorias: [] });

  const result = await eventoService.crear({
    titulo: 'Evento de prueba A11',
    fecha: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ubicacion: 'Laboratorio aislado',
    cupo_maximo: 1,
    estado: 'BORRADOR',
  });

  assert.equal(created.descripcion, '');
  assert.equal(result.descripcion, '');
});
