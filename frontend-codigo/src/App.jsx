import { useEffect, useState } from 'react';
import axios from 'axios';

const empleadosPorTienda = {
  'Tienda Bangkok': ['DR1', 'DR2'],
  'Tienda Alcaldía': ['CM1', 'CM2', 'CM3'],
  'Tienda EPM': ['DM1', 'DM2'],
  'Tienda Washington': ['Carlos Marin', 'CM'],
};

export default function App() {
  const [codigo, setCodigo] = useState('');
  const [tienda, setTienda] = useState('');
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  const [mostrarCoords, setMostrarCoords] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'ingreso',
    codigoIngresado: '',
  });
  const [mensaje, setMensaje] = useState('');

  const obtenerCodigo = async (coordenadas) => {
    try {
      const res = await axios.post('https://cleanfast-backend.onrender.com/generar-codigo', {
        lat: coordenadas.latitude,
        lng: coordenadas.longitude,
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
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoords(coords);
        obtenerCodigo(coords);
      },
      () => setError('Debes activar la ubicación GPS para continuar.')
    );
  }, []);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigo);
  };

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
      <p style={{ fontSize: '18px', marginBottom: '30px', fontWeight: 'bold' }}>
        Bienvenido al sistema de registro de ingreso y salida de empleados.<br />
        Por favor, verifica que tu ubicación esté activada y procede con el registro.
      </p>

      {tienda && <h3>📌 Estás en: <strong>{tienda}</strong></h3>}

      <hr style={{ margin: '30px 0' }} />

      {error && (
        <>
          <p style={{ color: 'red', fontWeight: 'bold', marginTop: '20px' }}>{error}</p>
          {error.includes('expirado') && coords && (
            <button onClick={() => obtenerCodigo(coords)} style={{ marginTop: '10px' }}>
              🔄 Obtener nuevo código
            </button>
          )}
        </>
      )}

      {tienda && (
        <>
          <h2 style={{ fontSize: '28px' }}>Formulario de Registro</h2>

          <p style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '10px' }}>
            Este es un <strong>código de seguridad</strong> que valida que te encuentras dentro de la tienda autorizada. Debes ingresarlo en el formulario.
          </p>

          {codigo && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '28px', marginBottom: '8px' }}>{codigo}</h3>
              <button onClick={copiarCodigo}>📋 Copiar código</button>
            </div>
          )}

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

      {coords && (
        <div style={{ marginTop: '40px' }}>
          <button onClick={() => setMostrarCoords(!mostrarCoords)}>
            {mostrarCoords ? 'Ocultar coordenadas' : 'Mostrar coordenadas'}
          </button>
          {mostrarCoords && (
            <p style={{ marginTop: '10px' }}>
              Coordenadas actuales: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}