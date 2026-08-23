const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/tarifario.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.patch('/:id', asyncHandler(ctrl.actualizar));

module.exports = router;
