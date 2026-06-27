const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');

const db = {};
const basename = path.basename(__filename);

// Autoload de todos los modelos en esta carpeta.
// Cada archivo .model.js debe exportar una función `(sequelize) => Modelo`.
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.endsWith('.model.js')
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize);
    db[model.name] = model;
  });

// Una vez registrados todos los modelos, se ejecutan sus asociaciones.
// Cada modelo puede definir un método estático `associate(db)` para declarar
// relaciones (hasMany, belongsTo, belongsToMany, etc.).
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

module.exports = db;
