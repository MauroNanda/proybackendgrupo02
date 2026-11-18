'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
// El modelo se importa, pero su persistencia se sustituye debajo: no usar una base real.
process.env.DATABASE_URL ||= 'postgres://validation:example@127.0.0.1/convoca_ci';
process.env.DB_SSL = 'false';
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
