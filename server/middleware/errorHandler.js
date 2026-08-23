// Formateador de errores central. Los controladores lanzan Error con
// err.status y err.publicMessage cuando quieren un código/mensaje concreto;
// cualquier otro error se trata como 500 sin filtrar detalles internos.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.publicMessage || (status < 500 ? err.message : 'Error interno del servidor');
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
