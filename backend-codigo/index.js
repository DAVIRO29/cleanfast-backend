const express = require('express');
const cors = require('cors');
const { totp } = require('otplib');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Lista de tiendas con nombres reales y coordenadas
const tiendas = [
  { nombre: 'Tienda Alcaldía', lat: 6.149122, lng: -75.619144 },
  { nombre: 'Tienda EPM', lat: 6.245044, lng: -75.577914 },
  { nombre: 'Tienda Washington', lat: 38.650909, lng: -77.287941 },
];

// Configuración de código TOTP
const RADIO_PERMITIDO = 1000; // en metros (puedes ajustarlo)
const secreto = 'EMPRESA_TOTP_SECRETA_1234'; // secreto base para TOTP
const stepTiempo = 300; // duración del código en segundos (5 minutos)
const toleranciaVentana = 2; // actual ±1 ventana (10 minutos total)

// Calcular distancia (Haversine)
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

// Buscar la tienda más cercana dentro del radio permitido
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

// Ruta: generar código dinámico
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

// Ruta: registrar ingreso o salida
app.post('/registrar', (req, res) => {
  const { nombre, tipo, codigoIngresado, lat, lng } = req.body;
  console.log('Ubicación recibida (registrar):', lat, lng);

  const tiendaCercana = obtenerTiendaMasCercana(lat, lng);
  if (!tiendaCercana) {
    return res.status(403).json({ error: 'Ubicación inválida.' });
  }

  const valido = totp.check(codigoIngresado, secreto, {
    step: stepTiempo,
    window: toleranciaVentana, // actual, anterior y siguiente
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

// Iniciar servidor
app.listen(4000, () => {
  console.log('✅ Backend corriendo en http://localhost:4000');
});
