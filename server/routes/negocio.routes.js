const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/negocio.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(ctrl.obtener));
router.patch('/', asyncHandler(ctrl.actualizar));

module.exports = router;
