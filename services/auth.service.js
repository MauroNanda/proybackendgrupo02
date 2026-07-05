const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const { firmarToken } = require('../utils/jwt.util');
const { serializarUsuario } = require('../utils/usuario.util');
const notificacionService = require('./notificacion.service');

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

    if (usuario.two_factor_enabled) {
    return await this._iniciarFlujo2FA(usuario);
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

  /**
   * Maneja el login vía Google.
   */
  async loginGoogle({ id, email, displayName, picture }) {
    let usuario = await Usuario.findOne({ where: { google_id: id } });

    if (!usuario) {
      usuario = await Usuario.create({
        nombre: displayName,
        email: email,
        google_id: id,
        avatar_url: picture,
        rol: 'ASISTENTE',
      });
    }

    if (usuario.two_factor_enabled) {
      return await this._iniciarFlujo2FA(usuario);
    }

    return {
      token: this._generarToken(usuario),
      usuario: serializarUsuario(usuario),
    };
  }

  /**
   * Valida el código 2FA ingresado por el usuario.
   */
  async validarCodigo2FA(email, codigo) {
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario || usuario.codigo_2fa !== codigo || usuario.codigo_2fa_expira < new Date()) {
      throw new HttpError('Código inválido o expirado', 401);
    }

    // Limpiamos los campos temporales
    usuario.codigo_2fa = null;
    usuario.codigo_2fa_expira = null;
    await usuario.save();

    return {
      token: this._generarToken(usuario),
      usuario: serializarUsuario(usuario),
    };
  }

  /**
   * Método auxiliar privado para generar y enviar el código 2FA
   */
  async _iniciarFlujo2FA(usuario) {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.codigo_2fa = codigo;
    usuario.codigo_2fa_expira = new Date(Date.now() + 10 * 60000); // 10 min
    await usuario.save();

    await notificacionService.enviar(usuario.email, `Tu código es: ${codigo}`);
    
    return { requiere2FA: true, mensaje: 'Código enviado a tu email' };
  }

  async cambiarEstado2FA(usuarioId, habilitar) {
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) throw new HttpError('Usuario no encontrado', 404);

    usuario.two_factor_enabled = habilitar;
    await usuario.save();
    
    return { 
      message: habilitar ? '2FA habilitado correctamente' : '2FA desactivado correctamente',
      two_factor_enabled: usuario.two_factor_enabled 
    };
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
