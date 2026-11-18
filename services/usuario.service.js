const { Usuario } = require('../models');
const HttpError = require('../utils/http-error');
const PUBLIC_FIELDS=['id','nombre','username','email','rol','avatar_url','createdAt','updatedAt'];
const WRITE_FIELDS=['nombre','username','email','rol'];
function camposPermitidos(datos) {
  return Object.fromEntries(WRITE_FIELDS.filter(k=>Object.hasOwn(datos,k)).map(k=>[k,datos[k]]));
}
function publico(usuario) {
  const data=usuario.get?usuario.get({plain:true}):usuario;
  return Object.fromEntries(PUBLIC_FIELDS.filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));
}

/**
 * Servicio para gestionar la lógica de negocio de Usuarios.
 */
class UsuarioService {
  /**
   * Obtiene todos los usuarios.
   */
  async obtenerTodos() {
    return await Usuario.findAll({attributes:PUBLIC_FIELDS});
  }

  /**
   * Obtiene un usuario por ID.
   */
  async obtenerPorId(id) {
    const usuario = await Usuario.findByPk(id,{attributes:PUBLIC_FIELDS});
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
    return publico(await Usuario.create(camposPermitidos(datos)));
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

    return publico(await usuario.update(camposPermitidos(datos)));
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
