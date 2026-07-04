const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const { firmarToken } = require('../utils/jwt.util');
const { serializarUsuario } = require('../utils/usuario.util');

const BCRYPT_ROUNDS = 10;

class AuthService {
  /**
   * Registra un usuario con password hasheada (bcrypt).
   */
  async registro({ nombre, username, email, password, rol }) {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      throw new HttpError('El correo electrónico ya está registrado', 409);
    }
    if (username) {
      const existeUsername = await Usuario.findOne({ where: { username } });
      if (existeUsername) {
        throw new HttpError('El nombre de usuario ya está en uso', 409);
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const usuario = await Usuario.create({
      nombre,
      username: username || null,
      email,
      password: passwordHash,
      rol: rol || 'ASISTENTE',
    });

    const token = this._generarToken(usuario);

    return {
      token,
      usuario: serializarUsuario(usuario),
    };
  }

  /**
   * Valida credenciales y devuelve JWT + datos del usuario.
   */
  /**
   * Login acepta username o email (el campo se llama "username" en el body).
   */
  async login({ username, password }) {
    // Busca por username exacto o por email (para compatibilidad)
    const usuario = await Usuario.scope('conPassword').findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
      },
    });

    if (!usuario || !usuario.password) {
      throw new HttpError('Credenciales inválidas', 401);
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new HttpError('Credenciales inválidas', 401);
    }

    const token = this._generarToken(usuario);

    return {
      token,
      usuario: serializarUsuario(usuario),
    };
  }

  /**
   * Obtiene el perfil del usuario autenticado por ID.
   */
  async obtenerPerfil(usuarioId) {
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      throw new HttpError('Usuario no encontrado', 404);
    }
    return serializarUsuario(usuario);
  }

  _generarToken(usuario) {
    return firmarToken({
      id: usuario.id,
      email: usuario.email,
      username: usuario.username,
      rol: usuario.rol,
    });
  }
}

module.exports = new AuthService();
