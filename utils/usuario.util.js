/**
 * Serializa un Usuario para respuestas HTTP (sin password, camelCase para el frontend).
 */
function serializarUsuario(usuario) {
  const datos = usuario.get ? usuario.get({ plain: true }) : usuario;

  return {
    id: datos.id,
    nombre: datos.nombre,
    email: datos.email,
    rol: datos.rol,
    avatarUrl: datos.avatar_url || undefined,
  };
}

module.exports = { serializarUsuario };
