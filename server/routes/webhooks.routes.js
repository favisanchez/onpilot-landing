const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const ctrl = require('../controllers/webhooks.controller');

const router = express.Router();

// Público: Meta lo llama directamente, sin JWT de Onpilot. La autenticidad
// se verifica con el token de verificación (GET) y la firma HMAC (POST).
router.get('/whatsapp', ctrl.verificar);
router.post('/whatsapp', asyncHandler(ctrl.recibir));

module.exports = router;
