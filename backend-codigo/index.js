const express = require('express');
const cors = require('cors');
const { totp } = require('otplib');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors({
  origin: 'https://cleanfast.vercel.app'
}));
app.use(express.json());

const tiendas = [
  { nombre: 'Tienda Bangkok', lat: 6.145572, lng: -75.616028 },
  { nombre: 'Tienda Alcaldía', lat: 6.149122, lng: -75.619144 },
  { nombre: 'Tienda EPM', lat: 6.245044, lng: -75.577914 },
  { nombre: 'Tienda New York', lat: 40.66172, lng: -73.89392 },
];

const RADIO_PERMITIDO = 1000;
const secreto = process.env.TOTP_SECRET;
const stepTiempo = 300;
const toleranciaVentana = 2;

const calcularDistancia = (lat1, lng1, lat2, lng2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
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

app.post('/generar-codigo', (req, res) => {
  const { lat, lng } = req.body;
  console.log('Ubicación recibida (generar):', lat, lng);

  const tiendaCercana = obtenerTiendaMasCercana(lat, lng);
  if (!tiendaCercana) {
    return res.status(403).json({ error: 'No estás cerca de una tienda autorizada.' });
  }

  const codigo = totp.generate(secreto, { step: stepTiempo });
  res.json({
    codigo,
    tienda: tiendaCercana.nombre,
  });
});

app.post('/registrar', (req, res) => {
  const { nombre, tipo, codigoIngresado, lat, lng } = req.body;
  console.log('Ubicación recibida (registrar):', lat, lng);

  const tiendaCercana = obtenerTiendaMasCercana(lat, lng);
  if (!tiendaCercana) {
    return res.status(403).json({ error: 'Ubicación inválida.' });
  }

  const valido = totp.check(codigoIngresado, secreto, {
    step: stepTiempo,
    window: toleranciaVentana,
  });

  if (!valido) {
    return res.status(403).json({ error: 'Código incorrecto o expirado.' });
  }

  const now = new Date().toISOString();
  const registro = `${now},${nombre},${tipo},${tiendaCercana.nombre},${lat},${lng}\n`;
  const archivo = path.join(__dirname, 'registros.csv');

  fs.appendFile(archivo, registro, (err) => {
    if (err) return res.status(500).json({ error: 'Error al guardar el registro.' });
    res.json({ mensaje: 'Registro exitoso. ¡Gracias!' });
  });
});

// ✅ NUEVA RUTA: REPORTES
app.get('/reportes', (req, res) => {
  const { tipo, fecha, tienda, empleado, desde, hasta } = req.query;
  const archivo = path.join(__dirname, 'registros.csv');

  if (!fs.existsSync(archivo)) {
    return res.status(404).json({ error: 'No hay registros disponibles.' });
  }

  const registros = fs.readFileSync(archivo, 'utf-8')
    .trim()
    .split('\n')
    .map(linea => {
      const [timestamp, nombre, tipo, tienda, lat, lng] = linea.split(',');
      return { timestamp, nombre, tipo, tienda, lat, lng };
    });

  let filtrados = registros;

  // Filtros generales
  if (fecha) {
    filtrados = filtrados.filter(r => r.timestamp.startsWith(fecha));
  }

  if (desde && hasta) {
    filtrados = filtrados.filter(r =>
      r.timestamp >= `${desde}T00:00:00` && r.timestamp <= `${hasta}T23:59:59`
    );
  }

  if (tienda) {
    filtrados = filtrados.filter(r => r.tienda === tienda);
  }

  if (empleado) {
    filtrados = filtrados.filter(r => r.nombre === empleado);
  }

  // Agrupación para reporte resumen ejecutivo
  if (tipo === 'resumen') {
    const resumen = {};

    filtrados.forEach((r) => {
      if (!resumen[r.tienda]) {
        resumen[r.tienda] = { registros: 0 };
      }
      resumen[r.tienda].registros++;
    });

    return res.json(resumen);
  }

  // Envío de datos planos para los otros tipos
  return res.json(filtrados);
});

app.listen(4000, () => {
  console.log('✅ Backend corriendo en http://localhost:4000');
});
