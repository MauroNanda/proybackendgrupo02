// ============================================================================
// HOOKS DEL CICLO DE VIDA DE EVENTOS
// ----------------------------------------------------------------------------
// Permite reaccionar a cambios de estado de un evento sin acoplar esa lógica a
// evento.service. Ejemplo de uso (ej. bot de Discord que difunde eventos):
//
//   const eventosHooks = require('../integrations/eventos.hooks');
//   eventosHooks.onPublicado(async (evento) => { await discord.anunciar(evento); });
//
// evento.service dispara `alPublicarEvento(evento)` cuando un evento pasa a
// PUBLICADO. Los handlers registrados corren aislados (un error no rompe el
// alta/edición del evento). Sin handlers registrados, es un no-op.
// ============================================================================

const handlers = {
  publicado: [],
};

async function alPublicarEvento(evento) {
  for (const fn of handlers.publicado) {
    try {
      await fn(evento);
    } catch (err) {
      console.error('[evento-hook] publicado:', err.message);
    }
  }
}

module.exports = {
  onPublicado: (fn) => handlers.publicado.push(fn),
  alPublicarEvento,
};
