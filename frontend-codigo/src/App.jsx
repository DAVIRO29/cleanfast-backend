import { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [codigo, setCodigo] = useState('');
  const [tienda, setTienda] = useState('');
  const [nombreEmpleado, setNombreEmpleado] = useState('');
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  const [mostrarCoords, setMostrarCoords] = useState(false);
  const [form, setForm] = useState({ tipo: 'ingreso', codigoIngresado: '' });
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);

  const obtenerDeviceId = () => {
    let id = localStorage.getItem('userDeviceId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('userDeviceId', id);
    }
    return id;
  };

  const obtenerCodigo = async (coordenadas) => {
    try {
      const res = await axios.post('https://cleanfast-backend.onrender.com/generar-codigo', {
        lat: coordenadas.latitude,
        lng: coordenadas.longitude,
      });
      setCodigo(res.data.codigo);
      setTienda(res.data.tienda);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al generar código.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const deviceId = obtenerDeviceId();
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setCoords(coords);
        await obtenerCodigo(coords);

        try {
          const res = await axios.post('https://cleanfast-backend.onrender.com/identificar-empleado', {
            deviceId,
          });
          setNombreEmpleado(res.data.nombre);
        } catch (e) {
          setError('Este dispositivo no está autorizado para ningún empleado.');
        }
      },
      () => {
        setError('Debes activar la ubicación GPS para continuar.');
        setCargando(false);
      }
    );
  }, []);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigo);
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    const deviceId = obtenerDeviceId();
    try {
      const res = await axios.post('https://cleanfast-backend.onrender.com/registrar', {
        ...form,
        lat: coords.latitude,
        lng: coords.longitude,
        deviceId,
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

      {cargando && <p style={{ fontStyle: 'italic' }}>📍 Cargando ubicación...</p>}

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

      {!cargando && tienda && nombreEmpleado && (
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

          <p><strong>Empleado identificado:</strong> {nombreEmpleado}</p>

          <form onSubmit={enviarFormulario}>
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
