'use strict';

// Agrega los tipos de notificación EVENTO_CANCELADO y EVENTO_MODIFICADO al ENUM.
// Postgres no permite quitar valores de un ENUM, por eso el down es un no-op.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Notificaciones_tipo" ADD VALUE IF NOT EXISTS 'EVENTO_CANCELADO';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Notificaciones_tipo" ADD VALUE IF NOT EXISTS 'EVENTO_MODIFICADO';`
    );
  },

  down: async () => {
    // Postgres no soporta quitar valores de un ENUM sin recrear el tipo; no-op.
  },
};
