// Punto único donde se conectan las integraciones a los hooks/hub del sistema.
// Se invoca una vez al arrancar la app (desde app.js). Cada integración nueva
// de Fase 3 se registra acá, sin tocar los servicios de negocio.

const eventosHooks = require('./eventos.hooks');
const telegram = require('./telegram.service');
const discord = require('./discord.service');

function registrarIntegraciones() {
  // Nivel grupo: difundir en el canal de Telegram cuando se publica un evento.
  eventosHooks.onPublicado((evento) => telegram.anunciarEvento(evento));
  // Aviso al canal de Telegram cuando un evento se cancela.
  eventosHooks.onCancelado((evento) => telegram.anunciarCancelacion(evento));
  // Difundir también en el canal de Discord al publicar un evento.
  eventosHooks.onPublicado((evento) => discord.anunciarEvento(evento));
}

module.exports = registrarIntegraciones;
