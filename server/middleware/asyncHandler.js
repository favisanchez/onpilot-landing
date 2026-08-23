// Envuelve un handler async para que cualquier excepción llegue a next()
// y la maneje el errorHandler central, sin try/catch repetido en cada ruta.
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
