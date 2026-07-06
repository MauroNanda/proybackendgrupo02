const cron = require('node-cron');
const { Op } = require('sequelize');
const { Evento, Inscripcion, Usuario } = require('../models');
const notificaciones = require('../integrations/notificaciones');

// ============================================================================
// JOB DE RECORDATORIOS
// ----------------------------------------------------------------------------
// Corre cada 15 minutos y avisa a los inscriptos CONFIRMADO de los eventos
// PUBLICADO que empiezan dentro de las próximas 24 horas.
//
// Idempotencia: la columna Eventos.recordatorio_enviado_en. Antes de enviar
// se "reclama" el evento con un UPDATE condicional; si otra corrida (u otra
// instancia del server) ya lo marcó, el UPDATE afecta 0 filas y se saltea.
// Por eso la ventana es [ahora, ahora+24h] y no una franja angosta: si el
// server estuvo caído y se perdió una corrida, el evento se recupera en la
// siguiente (el aviso sale tarde, pero sale).
// ============================================================================

const CRON_EXPRESION = '*/15 * * * *';
const VENTANA_HORAS = 24;

let tarea = null;
let corriendo = false; // evita corridas superpuestas si una tarda más de 15'

async function enviarRecordatorios() {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + VENTANA_HORAS * 60 * 60 * 1000);

  // Eventos publicados que empiezan dentro de la ventana y sin recordatorio enviado.
  const eventos = await Evento.findAll({
    where: {
      estado: 'PUBLICADO',
      recordatorio_enviado_en: null,
      fecha: { [Op.gt]: ahora, [Op.lte]: limite },
    },
  });

  for (const evento of eventos) {
    // Claim atómico: solo un proceso logra pasar de NULL a timestamp.
    const [afectadas] = await Evento.update(
      { recordatorio_enviado_en: ahora },
      { where: { id: evento.id, recordatorio_enviado_en: null } }
    );
    if (afectadas === 0) continue; // otra instancia/corrida ya lo tomó

    const inscripciones = await Inscripcion.findAll({
      where: { eventoId: evento.id, estado: 'CONFIRMADO' },
      include: [{ model: Usuario, as: 'usuario' }],
    });

    // Envío secuencial: el hub ya aísla errores por canal, y acá aislamos
    // por usuario para que un fallo no corte el resto de la lista.
    for (const inscripcion of inscripciones) {
      if (!inscripcion.usuario) continue;
      try {
        await notificaciones.recordatorioEvento(inscripcion.usuario, evento);
      } catch (err) {
        console.error(`[recordatorios] usuario ${inscripcion.usuarioId}:`, err.message);
      }
    }

    console.log(`[recordatorios] "${evento.titulo}": ${inscripciones.length} aviso(s) enviados.`);
  }
}

function iniciar() {
  if (tarea) return; // idempotente: no duplicar el cron si se llama dos veces

  tarea = cron.schedule(CRON_EXPRESION, async () => {
    if (corriendo) return;
    corriendo = true;
    try {
      await enviarRecordatorios();
    } catch (err) {
      // Nunca tumbar el proceso por una corrida fallida: se reintenta en 15'.
      console.error('[recordatorios] corrida fallida:', err.message);
    } finally {
      corriendo = false;
    }
  });

  console.log(`[recordatorios] Job programado (${CRON_EXPRESION}).`);
}

function detener() {
  if (tarea) {
    tarea.stop();
    tarea = null;
  }
}

module.exports = { iniciar, detener, enviarRecordatorios };
