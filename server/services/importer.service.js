// Parseo y validación de la importación de clientes. Soporta .csv (parser
// propio, sin dependencias) y .xlsx (ExcelJS). No se usa "xlsx"/SheetJS: esa
// librería tiene vulnerabilidades conocidas (prototype pollution, ReDoS) sin
// parche disponible, y aquí se procesan archivos subidos por el usuario.
const ExcelJS = require('exceljs');

const COLUMNAS_VALIDAS = ['nombre', 'telefono', 'email', 'notas'];

function normalizaEncabezado(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace('teléfono', 'telefono')
    .replace('correo', 'email');
}

// Parser CSV mínimo pero correcto con campos entre comillas (soporta comas
// y comillas escapadas "" dentro de un campo, como RFC 4180).
function parseCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ''));
}

function esXlsx(nombreArchivo, mimetype) {
  return /\.xlsx$/i.test(nombreArchivo || '') || mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

async function filasDesdeXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const hoja = workbook.worksheets[0];
  const filas = [];
  hoja.eachRow((row) => {
    filas.push(row.values.slice(1).map((v) => (v === null || v === undefined ? '' : String(v))));
  });
  return filas;
}

function filasAObjetos(filas) {
  if (filas.length === 0) return [];
  const encabezados = filas[0].map(normalizaEncabezado);
  return filas.slice(1).map((fila) => {
    const obj = {};
    encabezados.forEach((h, i) => {
      if (COLUMNAS_VALIDAS.includes(h)) obj[h] = (fila[i] || '').trim();
    });
    return obj;
  });
}

// Devuelve un array de { fila, datos, estado, motivo }. "fila" es el número
// de fila del archivo (2 = primera fila de datos, tras el encabezado).
async function parsearArchivo(buffer, nombreArchivo, mimetype) {
  const filasCrudas = esXlsx(nombreArchivo, mimetype)
    ? await filasDesdeXlsx(buffer)
    : parseCSV(buffer.toString('utf8'));

  const objetos = filasAObjetos(filasCrudas);

  return objetos.map((datos, i) => {
    const nombre = datos.nombre || '';
    if (!nombre) {
      return { fila: i + 2, datos, estado: 'error', motivo: 'Falta el nombre' };
    }
    return {
      fila: i + 2,
      datos: {
        nombre,
        telefono: datos.telefono || '',
        email: datos.email || '',
        notas: datos.notas || '',
      },
      estado: 'ok',
      motivo: null,
    };
  });
}

module.exports = { parsearArchivo };
