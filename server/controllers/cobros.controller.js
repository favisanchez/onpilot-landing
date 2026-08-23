// Endpoint transaccional: confirma el cobro de una cita, aplicando descuento
// VIP automático + descuento adicional manual, y en la misma transacción
// actualiza el estado de la cita y los contadores (visitas/gasto/última
// visita) del cliente.
const pool = require('../db/pool');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function crear(req, res) {
  const { cita_id, dto_adicional } = req.body || {};
  if (!cita_id) return res.status(400).json({ error: 'Falta cita_id' });
  const dtoAdicional = clamp(Number(dto_adicional) || 0, 0, 100);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: citaRows } = await client.query(
      `SELECT * FROM citas WHERE id = $1 AND negocio_id = $2 FOR UPDATE`,
      [cita_id, req.negocioId]
    );
    const cita = citaRows[0];
    if (!cita) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    if (cita.estado !== 'confirmada') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `La cita ya está en estado "${cita.estado}"` });
    }

    const { rows: clienteRows } = await client.query(
      `SELECT * FROM clientes WHERE id = $1 AND negocio_id = $2 FOR UPDATE`,
      [cita.cliente_id, req.negocioId]
    );
    const cliente = clienteRows[0];
    if (!cliente) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    let precioBase = 80; // valor por defecto si el servicio ya no está en el tarifario
    if (cita.tarifario_id) {
      const { rows: tarifRows } = await client.query('SELECT precio FROM tarifario WHERE id = $1', [
        cita.tarifario_id,
      ]);
      if (tarifRows[0]) precioBase = tarifRows[0].precio;
    } else {
      const { rows: tarifRows } = await client.query(
        'SELECT precio FROM tarifario WHERE negocio_id = $1 AND lower(servicio) = lower($2)',
        [req.negocioId, cita.servicio_nombre]
      );
      if (tarifRows[0]) precioBase = tarifRows[0].precio;
    }

    const dtoVip = cliente.vip ? cliente.descuento_vip : 0;
    const dtoTotal = clamp(dtoVip + dtoAdicional, 0, 100);
    const precioFinal = Math.round(precioBase * (1 - dtoTotal / 100));

    const { rows: cobroRows } = await client.query(
      `INSERT INTO cobros (negocio_id, cliente_id, cita_id, servicio_nombre, precio_base, dto_vip, dto_adicional, precio_final)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.negocioId, cliente.id, cita.id, cita.servicio_nombre, precioBase, dtoVip, dtoAdicional, precioFinal]
    );

    await client.query(`UPDATE citas SET estado = 'cobrada', actualizado_en = now() WHERE id = $1`, [
      cita.id,
    ]);

    const { rows: clienteActualizado } = await client.query(
      `UPDATE clientes
          SET visitas = visitas + 1,
              gasto_total = gasto_total + $2,
              ultima_visita = CURRENT_DATE,
              actualizado_en = now()
        WHERE id = $1
        RETURNING visitas, gasto_total, ultima_visita`,
      [cliente.id, precioFinal]
    );

    await client.query('COMMIT');

    const cobro = cobroRows[0];
    res.status(201).json({
      cobro: {
        id: cobro.id,
        cita_id: cobro.cita_id,
        cliente_id: cobro.cliente_id,
        f: cobro.fecha,
        s: cobro.servicio_nombre,
        base: cobro.precio_base,
        final: cobro.precio_final,
        dto: dtoTotal,
        ts: new Date(cobro.creado_en).getTime(),
      },
      cliente: {
        visitas: clienteActualizado[0].visitas,
        gasto: clienteActualizado[0].gasto_total,
        ultima: 'Hoy',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function marcarError(req, res) {
  const { id } = req.params;
  const { nota_error } = req.body || {};
  if (!nota_error) return res.status(400).json({ error: 'nota_error es obligatoria' });

  const { rows } = await pool.query(
    `UPDATE cobros SET estado = 'error', nota_error = $3
      WHERE id = $1 AND negocio_id = $2 RETURNING id, estado, nota_error`,
    [id, req.negocioId, nota_error]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cobro no encontrado' });
  res.json(rows[0]);
}

module.exports = { crear, marcarError };
