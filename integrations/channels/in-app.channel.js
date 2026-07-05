const { Notificacion } = require('../../models');

// Canal de notificación in-app (campana): persiste la notificación en la BD.
// Es un canal más dentro del hub de notificaciones (ver ../notificaciones.js).
module.exports = {
  nombre: 'in-app',

  async inscripcionConfirmada(usuario, evento) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Confirmación de Inscripción',
      mensaje: `Te has inscrito exitosamente${evento?.titulo ? ` a ${evento.titulo}` : ' al evento'}.`,
      tipo: 'INSCRIPCION',
    });
  },

  async inscripcionEnEspera(usuario, evento) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'En lista de espera',
      mensaje: `El cupo está completo${evento?.titulo ? ` para ${evento.titulo}` : ''}. Quedaste en lista de espera.`,
      tipo: 'INSCRIPCION',
    });
  },

  async cupoLiberado(usuario) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Inscripción Confirmada desde Lista de Espera',
      mensaje: 'Se liberó un cupo y has sido promovido a la lista de confirmados.',
      tipo: 'CUPO_LIBERADO',
    });
  },
};
