const { crearCita, cancelarCita, listarSemana } = require('../services/citas.service');

async function listar(req, res) {
  const resultado = await listarSemana(req.negocioId, req.query.semana);
  res.json(resultado);
}

async function crear(req, res) {
  const resultado = await crearCita(req.negocioId, req.body || {});
  res.status(201).json(resultado);
}

async function actualizar(req, res) {
  const { estado } = req.body || {};
  // Este endpoint solo cancela citas; pasar a "cobrada" es responsabilidad
  // exclusiva de POST /api/cobros, que actualiza todo en una transacción.
  if (estado !== 'cancelada') {
    return res.status(400).json({ error: 'Solo se admite estado "cancelada" en este endpoint' });
  }
  const resultado = await cancelarCita(req.negocioId, req.params.id);
  res.json(resultado);
}

module.exports = { listar, crear, actualizar };
