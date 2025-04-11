// index.js con PostgreSQL + gestión de dispositivos
const express = require('express');
const cors = require('cors');
const { totp } = require('otplib');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors({ origin: 'https://cleanfast.vercel.app' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const tiendas = [
  { nombre: 'Tienda Bangkok', lat: 6.145572, lng: -75.616028 },
  { nombre: 'Tienda Alcaldía', lat: 6.149122, lng: -75.619144 },
  { nombre: 'Tienda EPM', lat: 6.245044, lng: -75.577914 },
  { nombre: 'Tienda Washington', lat: 38.650909, lng: -77.287941 },
];

const RADIO_PERMITIDO = 1000;
const secreto = process.env.TOTP_SECRET || 'EMPRESA_TOTP_SECRETA_1234';
const dispositivosPath = path.join(__dirname, 'dispositivos.json');
const clavesPath = path.join(__dirname, 'claves.json');

const calcularDistancia = (lat1, lng1, lat2, lng2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const obtenerTiendaMasCercana = (lat, lng) => {
  const tiendasEnRango = tiendas
    .map((tienda) => ({
      ...tienda,
      distancia: calcularDistancia(lat, lng, tienda.lat, tienda.lng),
    }))
    .filter((t) => t.distancia <= RADIO_PERMITIDO);
  if (tiendasEnRango.length === 0) return null;
  return tiendasEnRango.sort((a, b) => a.distancia - b.distancia)[0];
};

const cargarDispositivos = () => {
  if (!fs.existsSync(dispositivosPath)) return {};
  return JSON.parse(fs.readFileSync(dispositivosPath));
};

const guardarDispositivos = (data) => {
  fs.writeFileSync(dispositivosPath, JSON.stringify(data, null, 2));
};

const cargarClaves = () => {
  if (!fs.existsSync(clavesPath)) return {};
  return JSON.parse(fs.readFileSync(clavesPath));
};

// Registro de dispositivo con clave de seguridad
app.post('/registrar-dispositivo', (req, res) => {
  const { nombre, deviceId, clave } = req.body;
  if (!nombre || !deviceId || !clave) return res.status(400).json({ error: 'Faltan datos' });
  const claves = cargarClaves();
  if (claves[nombre] !== clave) return res.status(403).json({ error: 'Clave de seguridad incorrecta' });
  const mapa = cargarDispositivos();
  mapa[nombre] = deviceId;
  guardarDispositivos(mapa);
  res.json({ mensaje: 'Dispositivo registrado con éxito' });
});

app.get('/dispositivos', (req, res) => {
  const mapa = cargarDispositivos();
  res.json(mapa);
});

app.delete('/dispositivos/:nombre', (req, res) => {
  const mapa = cargarDispositivos();
  delete mapa[req.params.nombre];
  guardarDispositivos(mapa);
  res.json({ mensaje: 'Dispositivo eliminado' });
});

app.put('/dispositivos/:nombre', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Falta el deviceId' });
  const mapa = cargarDispositivos();
  mapa[req.params.nombre] = deviceId;
  guardarDispositivos(mapa);
  res.json({ mensaje: 'Dispositivo actualizado' });
});

// Identificar empleado según deviceId
app.post('/identificar-empleado', (req, res) => {
  const { deviceId } = req.body;
  const mapa = cargarDispositivos();
  const nombre = Object.keys(mapa).find((k) => mapa[k] === deviceId);
  if (!nombre) return res.status(403).json({ error: 'Dispositivo no autorizado' });
  res.json({ nombre });
});

// Generar código TOTP
app.post('/generar-codigo', (req, res) => {
  const { lat, lng } = req.body;
  const tiendaCercana = obtenerTiendaMasCercana(lat, lng);
  if (!tiendaCercana) return res.status(403).json({ error: 'No estás cerca de una tienda autorizada.' });
  const codigo = totp.generate(secreto, { step: 300 });
  res.json({ codigo, tienda: tiendaCercana.nombre });
});

// Registrar ingreso o salida en PostgreSQL
app.post('/registrar', async (req, res) => {
  const { tipo, codigoIngresado, lat, lng, deviceId } = req.body;
  const tiendaCercana = obtenerTiendaMasCercana(lat, lng);
  if (!tiendaCercana) return res.status(403).json({ error: 'Ubicación inválida.' });

  const valido = totp.check(codigoIngresado, secreto, { step: 300, window: 2 });
  if (!valido) return res.status(403).json({ error: 'Código incorrecto o expirado.' });

  const mapa = cargarDispositivos();
  const nombre = Object.keys(mapa).find((k) => mapa[k] === deviceId);
  if (!nombre) return res.status(403).json({ error: 'Dispositivo no registrado para ningún empleado.' });

  const now = new Date().toISOString();

  try {
    await pool.query(
      'INSERT INTO registros (fecha, nombre, tipo, tienda, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)',
      [now, nombre, tipo, tiendaCercana.nombre, lat, lng]
    );
    res.json({ mensaje: 'Registro exitoso. ¡Gracias!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

// Reportes PostgreSQL
app.get('/reportes/tienda', async (req, res) => {
  const { tienda, fecha } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM registros WHERE tienda = $1 AND fecha::text LIKE $2 ORDER BY fecha ASC',
      [tienda, `${fecha}%`]
    );
    const datos = result.rows.map((r) => ({
      fecha: r.fecha.toISOString().slice(0, 16).replace('T', ' - '),
      nombre: r.nombre,
      tipo: r.tipo,
      tienda: r.tienda,
    }));
    res.json(datos);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar datos' });
  }
});

app.get('/reportes/empleado', async (req, res) => {
  const { nombre } = req.query;
  try {
    const result = await pool.query('SELECT * FROM registros WHERE nombre = $1 ORDER BY fecha DESC', [nombre]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar datos' });
  }
});

app.get('/reportes/rango', async (req, res) => {
  const { inicio, fin } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM registros WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha ASC',
      [inicio, fin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar datos' });
  }
});

app.get('/reportes/resumen', async (req, res) => {
  try {
    const result = await pool.query('SELECT nombre, tipo, COUNT(*) as cantidad FROM registros GROUP BY nombre, tipo');
    const resumen = {};
    result.rows.forEach((r) => {
      if (!resumen[r.nombre]) resumen[r.nombre] = { ingresos: 0, salidas: 0 };
      if (r.tipo === 'ingreso') resumen[r.nombre].ingresos = Number(r.cantidad);
      if (r.tipo === 'salida') resumen[r.nombre].salidas = Number(r.cantidad);
    });
    res.json(resumen);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar datos' });
  }
});

app.listen(4000, () => {
  console.log('✅ Backend corriendo con PostgreSQL y gestión de dispositivos');
});
