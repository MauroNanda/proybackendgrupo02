const dashboardService = require('../services/dashboard.service');

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
}

module.exports = new DashboardController();
