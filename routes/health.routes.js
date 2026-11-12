const router = require('express').Router();
const sequelize = require('../config/db');
const { healthCheck } = require('../utils/health-check');
router.get('/', healthCheck(() => sequelize.authenticate()));
module.exports = router;
