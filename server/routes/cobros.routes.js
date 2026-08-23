const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/cobros.controller');

const router = express.Router();
router.use(requireAuth);

router.post('/', asyncHandler(ctrl.crear));
router.patch('/:id', asyncHandler(ctrl.marcarError));

module.exports = router;
