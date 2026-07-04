'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const ROUNDS = 10;

module.exports = {
  async up(queryInterface) {
    // Eliminar usuario test previo si existe
    await queryInterface.bulkDelete(
      'Usuarios',
      {
        email: ['test@test.com', 'user@test.com', 'admin@test.com', 'usertest@usertest.com'],
      },
      {},
    );

    const adminHash = await bcrypt.hash('admin', ROUNDS);
    const userHash = await bcrypt.hash('user123', ROUNDS);

    const now = new Date();

    await queryInterface.bulkInsert('Usuarios', [
      // ── Admin principal ──────────────────────────────────────────
      {
        id: uuidv4(),
        nombre: 'Administrador',
        username: 'admin',
        email: 'admin@convoca.app',
        password: adminHash,
        rol: 'ORGANIZADOR',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },

      // ── Usuarios de prueba ────────────────────────────────────────
      {
        id: uuidv4(),
        nombre: 'Laura Gómez',
        username: 'laura',
        email: 'laura@demo.com',
        password: userHash,
        rol: 'ASISTENTE',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        nombre: 'Carlos Méndez',
        username: 'carlos',
        email: 'carlos@demo.com',
        password: userHash,
        rol: 'ASISTENTE',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        nombre: 'Valentina Ruiz',
        username: 'vale',
        email: 'vale@demo.com',
        password: userHash,
        rol: 'ASISTENTE',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        nombre: 'Martín Torres',
        username: 'martin',
        email: 'martin@demo.com',
        password: userHash,
        rol: 'ASISTENTE',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        nombre: 'Sofía Herrera',
        username: 'sofia',
        email: 'sofia@demo.com',
        password: userHash,
        rol: 'ASISTENTE',
        two_factor_enabled: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'Usuarios',
      {
        username: ['admin', 'laura', 'carlos', 'vale', 'martin', 'sofia'],
      },
      {},
    );
  },
};
