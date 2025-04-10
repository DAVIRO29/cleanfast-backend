import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Reportes from './Reportes';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/reportes" element={<Reportes />} />
  </Routes>
</BrowserRouter>

const empleadosPorTienda = {
  'Tienda Bangkok': ['DR1', 'DR2'],
  'Tienda Alcaldía': ['CM1', 'CM2', 'CM3'],
  'Tienda EPM': ['DM1', 'DM2'],
};

export default function App() {
  const [codigo, setCodigo] = useState('');
  const [tienda, setTienda] = useState('');
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'ingreso',
    codigoIngresado: '',
  });
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setCoords(coords);
        try {
          const res = await axios.post('https://cleanfast-backend.onrender.com/generar-codigo', {
            lat: coords.latitude,
            lng: coords.longitude,
          });
          setCodigo(res.data.codigo);
          setTienda(res.data.tienda);
          const empleados = empleadosPorTienda[res.data.tienda] || [];
          setEmpleadosDisponibles(empleados);
          setError('');
        } catch (e) {
          if (e.response?.status === 403 && e.response.data?.error?.includes('No estás cerca')) {
            setError('🚫 No es posible registrar el acceso porque no estás dentro de una tienda autorizada.');
          } else {
            setError(e.response?.data?.error || 'Error al generar código.');
          }
        }
      },
      () => setError('Debes activar la ubicación GPS para continuar.')
    );
  }, []);

  const enviarFormulario = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://cleanfast-backend.onrender.com/registrar', {
        ...form,
        lat: coords.latitude,
        lng: coords.longitude,
      });
      setMensaje(res.data.mensaje);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al registrar.');
      setMensaje('');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>CLEAN FAST</h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>
        Bienvenido al sistema de registro de ingreso y salida de empleados.
        Por favor, verifica que tu ubicación esté activada y procede con el registro.
      </p>

      {coords && (
        <p>
          Coordenadas actuales: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </p>
      )}
      {codigo && <h2 style={{ fontSize: '40px', marginTop: '10px' }}>{codigo}</h2>}
      {tienda && <h3>📌 Estás en: <strong>{tienda}</strong></h3>}

      <hr style={{ margin: '30px 0' }} />

      {error && (
        <p style={{ color: 'red', fontWeight: 'bold', marginTop: '20px' }}>{error}</p>
      )}

      {tienda && (
        <>
          <h2>Formulario de Registro</h2>
          <form onSubmit={enviarFormulario}>
            <select
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            >
              <option value="">Selecciona tu nombre</option>
              {empleadosDisponibles.map((empleado) => (
                <option key={empleado} value={empleado}>
                  {empleado}
                </option>
              ))}
            </select>
            <br /><br />

            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="ingreso">Ingreso</option>
              <option value="salida">Salida</option>
            </select>
            <br /><br />

            <input
              type="text"
              placeholder="Código mostrado"
              value={form.codigoIngresado}
              onChange={(e) => setForm({ ...form, codigoIngresado: e.target.value })}
              required
            />
            <br /><br />
            <button type="submit">Registrar</button>
          </form>
        </>
      )}

      <br />
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
    </div>
  );
}
