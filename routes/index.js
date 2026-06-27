const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);

// Autoload de todas las rutas en esta carpeta.
// Cada archivo .routes.js es cargado dinámicamente.
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.endsWith('.routes.js')
    );
  })
  .forEach((file) => {
    const routeModule = require(path.join(__dirname, file));

    // Si el archivo exporta un objeto con prefijo y router explícito:
    // module.exports = { prefix: '/auth', router };
    if (routeModule.prefix && routeModule.router) {
      router.use(routeModule.prefix, routeModule.router);
    } else {
      // Fallback por convención de nombre de archivo:
      // 'usuario.routes.js' -> '/usuarios'
      // 'auth.routes.js' -> '/auth'
      const name = file.replace('.routes.js', '');
      const prefix =
        name === 'auth' || name === 'health' ? `/${name}` : `/${name}s`;
      router.use(prefix, routeModule);
    }
  });

module.exports = router;
