// Siembra varios negocios de ejemplo (uno por sector) con clientes, tarifario,
// citas y cobros coherentes entre sí, para poder hacer una demo realista.
// Uso: node server/db/seed.js [--reset]
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const { avatarColorIdx } = require('../controllers/clientes.controller');
const { toISODate } = require('../utils/dates');

const RESET = process.argv.includes('--reset');
const PASSWORD_DEMO = 'demo1234';

const NOMBRES = [
  'María', 'Carlos', 'Laura', 'Javier', 'Ana', 'Miguel', 'Elena', 'David',
  'Sofía', 'Pablo', 'Lucía', 'Daniel', 'Marta', 'Alejandro', 'Carmen',
  'Sergio', 'Isabel', 'Raúl', 'Patricia', 'Adrián', 'Cristina', 'Rubén',
];
const APELLIDOS = [
  'García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández',
  'Ruiz', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Navarro', 'Torres',
  'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function nombreAleatorio(usados) {
  let nombre;
  do {
    nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
  } while (usados.has(nombre));
  usados.add(nombre);
  return nombre;
}
function fechaHace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return toISODate(d);
}
function fechaEnDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}
function horaAleatoria() {
  const horas = ['09:00', '09:30', '10:00', '11:00', '11:30', '12:00', '16:00', '17:00', '17:30', '18:00'];
  return pick(horas);
}

const NEGOCIOS = [
  {
    nombre: 'Fisio Vitalia',
    sector: 'fisioterapia',
    email: 'demo.fisioterapia@onpilot.app',
    telefono: '611223344',
    tarifario: [
      ['Sesión de fisioterapia general', 'Tratamientos', 45, 50],
      ['Masaje descontracturante', 'Masajes', 40, 45],
      ['Punción seca', 'Tratamientos', 35, 30],
      ['Rehabilitación post-quirúrgica', 'Tratamientos', 55, 60],
      ['Vendaje neuromuscular', 'Tratamientos', 15, 15],
      ['Valoración inicial', 'Consultas', 30, 30],
    ],
  },
  {
    nombre: 'Estética Bella Piel',
    sector: 'estetica',
    email: 'demo.estetica@onpilot.app',
    telefono: '622334455',
    tarifario: [
      ['Limpieza facial profunda', 'Facial', 45, 50],
      ['Manicura', 'Manos y pies', 20, 40],
      ['Pedicura', 'Manos y pies', 25, 45],
      ['Depilación láser (zona media)', 'Depilación', 60, 30],
      ['Masaje relajante', 'Corporal', 50, 60],
      ['Peeling químico', 'Facial', 70, 40],
    ],
  },
  {
    nombre: 'Nutrición Equilibrio',
    sector: 'nutricion',
    email: 'demo.nutricion@onpilot.app',
    telefono: '633445566',
    tarifario: [
      ['Primera consulta nutricional', 'Consultas', 50, 60],
      ['Consulta de seguimiento', 'Consultas', 30, 30],
      ['Plan nutricional deportivo', 'Planes', 65, 45],
      ['Análisis de composición corporal', 'Diagnóstico', 25, 20],
      ['Consulta online', 'Consultas', 25, 30],
    ],
  },
  {
    nombre: 'Coach Fit Pro',
    sector: 'entrenador_personal',
    email: 'demo.entrenador@onpilot.app',
    telefono: '644556677',
    tarifario: [
      ['Sesión personal 1 a 1', 'Entrenamiento', 40, 60],
      ['Sesión dúo', 'Entrenamiento', 30, 60],
      ['Valoración física inicial', 'Diagnóstico', 35, 45],
      ['Plan de entrenamiento mensual', 'Planes', 90, 30],
      ['Sesión de recuperación/movilidad', 'Entrenamiento', 35, 45],
    ],
  },
];

const CANALES = ['WhatsApp', 'Teléfono', 'En el negocio', 'Email'];

async function reset(client) {
  console.log('--reset: vaciando tablas...');
  await client.query(
    'TRUNCATE negocios, refresh_tokens, clientes, tarifario, citas, cobros RESTART IDENTITY CASCADE'
  );
}

async function sembrarNegocio(client, def) {
  const { rows: existentes } = await client.query('SELECT id FROM negocios WHERE email = $1', [def.email]);
  if (existentes.length > 0) {
    console.log(`- ${def.nombre} ya existe, se omite`);
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 12);
  const { rows: negRows } = await client.query(
    `INSERT INTO negocios (nombre, sector, telefono, email, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [def.nombre, def.sector, def.telefono, def.email, passwordHash]
  );
  const negocioId = negRows[0].id;

  const tarifario = [];
  for (const [servicio, categoria, precio, duracion] of def.tarifario) {
    const { rows } = await client.query(
      `INSERT INTO tarifario (negocio_id, servicio, categoria, precio, duracion_min)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [negocioId, servicio, categoria, precio, duracion]
    );
    tarifario.push(rows[0]);
  }

  const nombresUsados = new Set();
  const totalClientes = randomInt(10, 15);
  for (let i = 0; i < totalClientes; i++) {
    const nombre = nombreAleatorio(nombresUsados);
    // Reparto de perfiles: ~25% VIP, ~25% nuevos (0-1 visita), resto
    // regulares — dentro de los regulares no-VIP, algunos con >60 días sin
    // volver para poder mostrar el tag "Reactivar".
    const perfil = i < totalClientes * 0.25 ? 'vip' : i < totalClientes * 0.5 ? 'nueva' : 'regular';
    const vip = perfil === 'vip';
    const descuentoVip = vip ? pick([10, 15, 20]) : 0;
    const fechaAlta = fechaHace(randomInt(30, 700));

    const { rows: clRows } = await client.query(
      `INSERT INTO clientes (negocio_id, nombre, telefono, email, fecha_alta, vip, descuento_vip, avatar_color_idx)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        negocioId,
        nombre,
        `6${randomInt(10000000, 99999999)}`,
        `${nombre.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        fechaAlta,
        vip,
        descuentoVip,
        avatarColorIdx(nombre),
      ]
    );
    const clienteId = clRows[0].id;

    // Historial de citas/cobros pasados, según el perfil.
    let numVisitasPasadas = 0;
    let ventanaDias = [3, 45]; // rango de "hace cuántos días" para la última visita
    if (perfil === 'nueva') numVisitasPasadas = randomInt(0, 1);
    else if (perfil === 'vip') numVisitasPasadas = randomInt(3, 8);
    else {
      // ~mitad de los "regular" se convierten en candidatos a "Reactivar":
      // >1 visita, no VIP, más de 60 días sin volver.
      const esReactivar = i % 2 === 0;
      numVisitasPasadas = randomInt(2, 5);
      if (esReactivar) ventanaDias = [65, 160];
    }

    for (let v = 0; v < numVisitasPasadas; v++) {
      const esUltima = v === numVisitasPasadas - 1;
      const diasAtras = esUltima ? randomInt(ventanaDias[0], ventanaDias[1]) : randomInt(ventanaDias[1], ventanaDias[1] + 200);
      const tarifa = pick(tarifario);
      const fecha = fechaHace(diasAtras);
      const { rows: citaRows } = await client.query(
        `INSERT INTO citas (negocio_id, cliente_id, tarifario_id, servicio_nombre, duracion_min, fecha, hora, canal_reserva, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cobrada') RETURNING id`,
        [negocioId, clienteId, tarifa.id, tarifa.servicio, tarifa.duracion_min, fecha, horaAleatoria(), pick(CANALES)]
      );
      const dtoVip = vip ? descuentoVip : 0;
      const dtoAdicional = Math.random() < 0.15 ? pick([5, 10]) : 0;
      const precioFinal = Math.round(tarifa.precio * (1 - (dtoVip + dtoAdicional) / 100));
      await client.query(
        `INSERT INTO cobros (negocio_id, cliente_id, cita_id, servicio_nombre, fecha, precio_base, dto_vip, dto_adicional, precio_final)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [negocioId, clienteId, citaRows[0].id, tarifa.servicio, fecha, tarifa.precio, dtoVip, dtoAdicional, precioFinal]
      );
    }

    // Alguna cita cancelada suelta, para variedad visual en el historial.
    if (Math.random() < 0.2) {
      const tarifa = pick(tarifario);
      await client.query(
        `INSERT INTO citas (negocio_id, cliente_id, tarifario_id, servicio_nombre, duracion_min, fecha, hora, canal_reserva, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cancelada')`,
        [negocioId, clienteId, tarifa.id, tarifa.servicio, tarifa.duracion_min, fechaHace(randomInt(5, 90)), horaAleatoria(), pick(CANALES)]
      );
    }

    // Citas próximas (confirmadas), repartidas en los próximos 10 días, solo
    // para una parte de los clientes — así la agenda de la semana actual
    // tiene contenido real que mostrar.
    if (Math.random() < 0.5) {
      const tarifa = pick(tarifario);
      await client.query(
        `INSERT INTO citas (negocio_id, cliente_id, tarifario_id, servicio_nombre, duracion_min, fecha, hora, canal_reserva, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmada')`,
        [negocioId, clienteId, tarifa.id, tarifa.servicio, tarifa.duracion_min, fechaEnDias(randomInt(0, 9)), horaAleatoria(), pick(CANALES)]
      );
    }
  }

  // Recalcula visitas/gasto_total/ultima_visita a partir de los cobros
  // reales insertados, en vez de llevar la cuenta a mano en el bucle.
  await client.query(
    `UPDATE clientes c SET
       visitas = COALESCE(sub.n, 0),
       gasto_total = COALESCE(sub.total, 0),
       ultima_visita = sub.ultima
     FROM (
       SELECT cliente_id, COUNT(*) AS n, SUM(precio_final) AS total, MAX(fecha) AS ultima
         FROM cobros WHERE negocio_id = $1 AND estado = 'valido' GROUP BY cliente_id
     ) sub
     WHERE c.id = sub.cliente_id AND c.negocio_id = $1`,
    [negocioId]
  );

  console.log(`- ${def.nombre}: ${totalClientes} clientes, ${tarifario.length} servicios en tarifario`);
}

async function run() {
  const client = await pool.connect();
  try {
    if (RESET) await reset(client);
    for (const def of NEGOCIOS) {
      await sembrarNegocio(client, def);
    }
    console.log(`\nListo. Contraseña de todos los negocios demo: "${PASSWORD_DEMO}"`);
    console.log('Emails: ' + NEGOCIOS.map((n) => n.email).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Error sembrando datos:', err);
  process.exit(1);
});
