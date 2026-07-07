const dashboardService = require('../services/dashboard.service');
const historialAccesoService = require('../services/historial-acceso.service');

class DashboardController {
  async kpis(req, res, next) {
    try {
      const datos = await dashboardService.obtenerKpis();
      res.json(datos);
    } catch (err) {
      next(err);
    }
  }

  async charts(req, res, next) {
    try {
      const datos = await dashboardService.obtenerDatosGraficos();
      res.json(datos);
    } catch (err) {
      next(err);
    }
  }

  async accesos(req, res, next) {
    try {
      const limite = Math.min(parseInt(req.query.limite, 10) || 100, 500);
      const datos = await historialAccesoService.listar(limite);
      res.json(datos);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
