const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const { firmarToken } = require('../utils/jwt.util');
const { serializarUsuario } = require('../utils/usuario.util');
const { enviarEmail } = require('../integrations/email.service');

const BCRYPT_ROUNDS = 10;
const CODIGO_2FA_MINUTOS = 10;

class AuthService {
  /**
   * Registra un usuario con password hasheada (bcrypt).
   */
  async registro({ nombre, username, email, password }) {
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

    // El rol NUNCA se toma del body: el registro público siempre crea ASISTENTE.
    // Promover a ORGANIZADOR solo por un endpoint protegido para admins (evita
    // la escalada de privilegios registrándose con { rol: 'ORGANIZADOR' }).
    const usuario = await Usuario.create({
      nombre,
      username: username || null,
      email,
      password: passwordHash,
      rol: 'ASISTENTE',
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

    // Vinculación de cuenta: si no hay match por google_id pero ya existe un
    // usuario con ese email (p. ej. registrado con password), vinculamos el
    // google_id a esa cuenta en vez de crear un duplicado (que rompería por el
    // unique de email). Recién si no existe por email, creamos una nueva.
    if (!usuario) {
      usuario = await Usuario.findOne({ where: { email } });
      if (usuario) {
        usuario.google_id = id;
        if (!usuario.avatar_url && picture) usuario.avatar_url = picture;
        await usuario.save();
      } else {
        usuario = await Usuario.create({
          nombre: displayName,
          email,
          google_id: id,
          avatar_url: picture,
          rol: 'ASISTENTE',
        });
      }
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

    // Sin flujo 2FA activo (o expirado) → inválido. Se chequea antes de comparar.
    if (!usuario || !usuario.codigo_2fa || !usuario.codigo_2fa_expira) {
      throw new HttpError('Código inválido o expirado', 401);
    }
    if (usuario.codigo_2fa_expira < new Date()) {
      usuario.codigo_2fa = null;
      usuario.codigo_2fa_expira = null;
      await usuario.save();
      throw new HttpError('Código inválido o expirado', 401);
    }

    // El código se guarda hasheado (bcrypt) → comparación segura, no texto plano.
    const codigoValido = await bcrypt.compare(codigo, usuario.codigo_2fa);
    if (!codigoValido) {
      throw new HttpError('Código inválido o expirado', 401);
    }

    // Un solo uso: limpiamos los campos temporales al validar.
    usuario.codigo_2fa = null;
    usuario.codigo_2fa_expira = null;
    await usuario.save();

    return {
      token: this._generarToken(usuario),
      usuario: serializarUsuario(usuario),
    };
  }

  /**
   * Genera un código 2FA, lo guarda hasheado y lo envía por email.
   * Devuelve el email para que el front sepa a qué cuenta pedir el código
   * (necesario en el flujo de Google, donde no lo tipeó el usuario).
   */
  async _iniciarFlujo2FA(usuario) {
    // crypto.randomInt es criptográficamente seguro (Math.random no lo es).
    const codigo = crypto.randomInt(100000, 1000000).toString();
    usuario.codigo_2fa = await bcrypt.hash(codigo, BCRYPT_ROUNDS);
    usuario.codigo_2fa_expira = new Date(Date.now() + CODIGO_2FA_MINUTOS * 60000);
    await usuario.save();

    await enviarEmail(
      usuario.email,
      'Tu código de verificación de Convoca',
      `<p>Tu código de verificación es: <strong>${codigo}</strong></p>` +
      `<p>Vence en ${CODIGO_2FA_MINUTOS} minutos. Si no fuiste vos, ignorá este correo.</p>`
    );

    return { requiere2FA: true, email: usuario.email, mensaje: 'Código enviado a tu email' };
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
