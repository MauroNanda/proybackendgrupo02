const { fn, col, Op, literal } = require('sequelize');
const { Usuario, Evento, Inscripcion, Valoracion } = require('../models');

class DashboardService {
  /**
   * Retorna los KPIs principales del sistema:
   * total de usuarios, eventos, inscripciones activas y promedio de valoraciones.
   * Se ejecutan en paralelo para minimizar la latencia.
   */
  async obtenerKpis() {
    const [totalUsuarios, totalEventos, totalInscripciones, valoracionResult] = await Promise.all([
      Usuario.count(),

      // Solo eventos publicados: los borradores son trabajo en curso y los
      // cancelados ya se desglosan en el gráfico "eventos por estado".
      // Así el KPI queda alineado con el catálogo público.
      Evento.count({ where: { estado: 'PUBLICADO' } }),

      // Solo contamos inscripciones que representan presencia real (no canceladas ni en espera)
      Inscripcion.count({
        where: { estado: { [Op.in]: ['CONFIRMADO', 'ASISTIO'] } },
      }),

      // Valoracion usa timestamps: false, por eso no filtramos por fecha aquí
      Valoracion.findOne({
        attributes: [[fn('AVG', col('puntuacion')), 'promedio']],
        raw: true,
      }),
    ]);

    return {
      totalUsuarios,
      totalEventos,
      totalInscripciones,
      promedioValoracion: valoracionResult?.promedio
        ? parseFloat(parseFloat(valoracionResult.promedio).toFixed(1))
        : null,
    };
  }

  /**
   * Retorna los datos listos para renderizar en Chart.js:
   * - Inscripciones por mes (últimos 6 meses) → gráfico de barras
   * - Distribución de inscripciones por estado → gráfico de torta
   * - Eventos por estado → gráfico de torta secundario
   */
  async obtenerDatosGraficos() {
    const seisAtras = new Date();
    seisAtras.setMonth(seisAtras.getMonth() - 5);
    seisAtras.setDate(1);
    seisAtras.setHours(0, 0, 0, 0);

    const [inscripcionesPorMes, distribucionEstados, eventosPorEstado] = await Promise.all([
      // DATE_TRUNC con literal para evitar problemas de quoting de camelCase en Postgres
      Inscripcion.findAll({
        attributes: [
          [literal(`DATE_TRUNC('month', "createdAt")`), 'mes'],
          [fn('COUNT', col('id')), 'total'],
        ],
        where: { createdAt: { [Op.gte]: seisAtras } },
        group: [literal(`DATE_TRUNC('month', "createdAt")`)],
        order: [[literal(`DATE_TRUNC('month', "createdAt")`), 'ASC']],
        raw: true,
      }),

      Inscripcion.findAll({
        attributes: ['estado', [fn('COUNT', col('id')), 'total']],
        group: ['estado'],
        raw: true,
      }),

      Evento.findAll({
        attributes: ['estado', [fn('COUNT', col('id')), 'total']],
        group: ['estado'],
        raw: true,
      }),
    ]);

    return { inscripcionesPorMes, distribucionEstados, eventosPorEstado };
  }
}

module.exports = new DashboardService();
