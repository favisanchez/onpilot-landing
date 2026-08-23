const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/clientes.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(ctrl.listar));
router.post('/importar/preview', upload.single('archivo'), asyncHandler(ctrl.importarPreview));
router.post('/importar', upload.single('archivo'), asyncHandler(ctrl.importarConfirmar));
router.get('/:id', asyncHandler(ctrl.obtener));
router.patch('/:id', asyncHandler(ctrl.actualizar));

module.exports = router;
