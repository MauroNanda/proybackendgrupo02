'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Índice compuesto: acelera el conteo de cupos y el listado de inscriptos por evento/estado.
    await queryInterface.addIndex('Inscripciones', ['eventoId', 'estado'], {
      name: 'idx_inscripciones_evento_estado',
    });
    // Índice simple: acelera la búsqueda de inscripciones de un usuario.
    await queryInterface.addIndex('Inscripciones', ['usuarioId'], {
      name: 'idx_inscripciones_usuario',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Inscripciones', 'idx_inscripciones_evento_estado');
    await queryInterface.removeIndex('Inscripciones', 'idx_inscripciones_usuario');
  },
};
