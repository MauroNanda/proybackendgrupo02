const { Notificacion } = require('../../models');

// Fecha legible en horario argentino: "vie 17/07, 18:00".
function fechaLegible(fecha) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleString('es-AR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// Arma el texto de qué cambió en un evento modificado (fecha y/o ubicación).
function textoCambios(evento, cambios = {}) {
  const partes = [];
  if (cambios.fecha) partes.push(`nueva fecha: ${fechaLegible(evento.fecha)}`);
  if (cambios.ubicacion) partes.push(`nuevo lugar: ${evento.ubicacion}`);
  return partes.join(' · ');
}

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

  async cupoLiberado(usuario, evento) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Inscripción Confirmada desde Lista de Espera',
      mensaje: `Se liberó un cupo${evento?.titulo ? ` en ${evento.titulo}` : ''} y pasaste a la lista de confirmados.`,
      tipo: 'CUPO_LIBERADO',
    });
  },

  async eventoCancelado(usuario, evento) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Evento cancelado',
      mensaje: `El evento${evento?.titulo ? ` "${evento.titulo}"` : ''} fue cancelado. Tu inscripción quedó sin efecto.`,
      tipo: 'EVENTO_CANCELADO',
    });
  },

  async eventoModificado(usuario, evento, cambios) {
    const detalle = textoCambios(evento, cambios);
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Cambio en un evento',
      mensaje: `El evento${evento?.titulo ? ` "${evento.titulo}"` : ''} cambió${detalle ? ` — ${detalle}` : ''}.`,
      tipo: 'EVENTO_MODIFICADO',
    });
  },

  async recordatorioEvento(usuario, evento) {
    await Notificacion.create({
      usuario_id: usuario.id,
      titulo: 'Recordatorio de evento',
      mensaje: `El evento${evento?.titulo ? ` "${evento.titulo}"` : ''} empieza pronto${evento?.fecha ? ` — ${fechaLegible(evento.fecha)}` : ''}.`,
      tipo: 'RECORDATORIO',
    });
  },
};
