'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Extensión para los índices GIN de búsqueda por texto (Caso 08)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // Caso 01: Índice para verificar rápido si un usuario ya está en un evento
    await queryInterface.sequelize.query('CREATE INDEX idx_a5_usuario_evento ON "Inscripciones" ("usuarioId", "eventoId");');

    // Casos 02 y 03: Índice compuesto para lista de espera y paginación
    await queryInterface.sequelize.query('CREATE INDEX idx_a5_evento_estado_fecha ON "Inscripciones" ("eventoId", estado, "createdAt" DESC, id DESC);');

    // Caso 05: Índice de fecha para el gráfico de inscripciones
    await queryInterface.sequelize.query('CREATE INDEX idx_a5_inscripciones_fecha ON "Inscripciones" ("createdAt");');

    // Caso 08: Índices GIN para acelerar ILIKE en nombre y email
    await queryInterface.sequelize.query('CREATE INDEX idx_a5_usuario_nombre_trgm ON "Usuarios" USING gin (nombre gin_trgm_ops);');
    await queryInterface.sequelize.query('CREATE INDEX idx_a5_usuario_email_trgm ON "Usuarios" USING gin (email gin_trgm_ops);');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_a5_usuario_nombre_trgm;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_a5_usuario_email_trgm;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_a5_inscripciones_fecha;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_a5_evento_estado_fecha;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_a5_usuario_evento;');
  }
};