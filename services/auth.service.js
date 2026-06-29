const bcrypt = require('bcrypt');
const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const { firmarToken } = require('../utils/jwt.util');
const { serializarUsuario } = require('../utils/usuario.util');

const BCRYPT_ROUNDS = 10;

class AuthService {
  /**
   * Registra un usuario con password hasheada (bcrypt).
   */
  async registro({ nombre, email, password, rol }) {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      throw new HttpError('El correo electrónico ya está registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const usuario = await Usuario.create({
      nombre,
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
  async login({ email, password }) {
    const usuario = await Usuario.scope('conPassword').findOne({ where: { email } });

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
      rol: usuario.rol,
    });
  }
}

module.exports = new AuthService();
