const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/metricas.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/metricas', asyncHandler(ctrl.resumen));

module.exports = router;
