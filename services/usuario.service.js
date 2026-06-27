const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');

/**
 * Servicio para gestionar la lógica de negocio de Usuarios.
 */
class UsuarioService {
  /**
   * Obtiene todos los usuarios.
   */
  async obtenerTodos() {
    return await Usuario.findAll();
  }

  /**
   * Obtiene un usuario por ID.
   */
  async obtenerPorId(id) {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      throw new HttpError('Usuario no encontrado', 404);
    }
    return usuario;
  }

  /**
   * Crea un nuevo usuario.
   */
  async crear(datos) {
    // Validar si el email ya existe
    const existe = await Usuario.findOne({ where: { email: datos.email } });
    if (existe) {
      throw new HttpError('El correo electrónico ya está registrado', 409);
    }
    return await Usuario.create(datos);
  }

  /**
   * Actualiza un usuario existente.
   */
  async actualizar(id, datos) {
    const usuario = await this.obtenerPorId(id);

    if (datos.email && datos.email !== usuario.email) {
      const existe = await Usuario.findOne({ where: { email: datos.email } });
      if (existe) {
        throw new HttpError('El correo electrónico ya está registrado', 409);
      }
    }

    return await usuario.update(datos);
  }

  /**
   * Elimina un usuario.
   */
  async eliminar(id) {
    const usuario = await this.obtenerPorId(id);
    await usuario.destroy();
    return { message: 'Usuario eliminado correctamente' };
  }
}

module.exports = new UsuarioService();
