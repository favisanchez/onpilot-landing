const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/conversaciones.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(ctrl.listar));
router.get('/:id/mensajes', asyncHandler(ctrl.obtenerMensajes));
router.post('/:id/mensajes', asyncHandler(ctrl.enviarMensaje));
router.patch('/:id/control', asyncHandler(ctrl.actualizarControl));

module.exports = router;
