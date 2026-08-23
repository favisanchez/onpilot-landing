// Configuración de multer para la importación de clientes: archivo único en
// memoria (no se escribe a disco), campo "archivo", límite 2MB.
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;
