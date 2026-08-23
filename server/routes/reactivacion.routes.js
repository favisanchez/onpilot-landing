const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/reactivacion.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/pendientes', asyncHandler(ctrl.listarPendientes));
router.post('/:id/enviar', asyncHandler(ctrl.enviarPropuesta));
router.patch('/:id', asyncHandler(ctrl.editarPropuesta));
router.delete('/:id', asyncHandler(ctrl.descartarPropuesta));

module.exports = router;
