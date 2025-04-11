// src/RegistroCel.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const empleadosPorTienda = {
  'Tienda Bangkok': ['DR1', 'DR2'],
  'Tienda Alcaldía': ['CM1', 'CM2', 'CM3'],
  'Tienda EPM': ['DM1', 'DM2'],
  'Tienda Washington': ['Carlos Marin', 'CM'],
};

export default function RegistroCel() {
  const [deviceId, setDeviceId] = useState('');
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [claveSeguridad, setClaveSeguridad] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [dispositivos, setDispositivos] = useState([]);
  const [modoAdmin, setModoAdmin] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem('userDeviceId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('userDeviceId', id);
    }
    setDeviceId(id);
  }, []);

  const registrar = async () => {
    if (!tiendaSeleccionada || !empleadoSeleccionado || !claveSeguridad) {
      return setError('Completa todos los campos.');
    }

    try {
      const nombre = empleadoSeleccionado;
      const res = await axios.post('https://cleanfast-backend.onrender.com/registrar-dispositivo', {
        nombre,
        deviceId,
        clave: claveSeguridad,
      });
      setMensaje(res.data.mensaje);
      setError('');
      setTiendaSeleccionada('');
      setEmpleadoSeleccionado('');
      setClaveSeguridad('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error registrando');
      setMensaje('');
    }
  };

  const cargarDispositivos = async () => {
    const res = await axios.get('https://cleanfast-backend.onrender.com/dispositivos');
    const lista = Object.entries(res.data).map(([nombre, id]) => ({ nombre, id }));
    setDispositivos(lista);
  };

  const eliminar = async (nombre) => {
    await axios.delete(`https://cleanfast-backend.onrender.com/dispositivos/${nombre}`);
    cargarDispositivos();
  };

  const actualizar = async (nombre, nuevoId) => {
    await axios.put(`https://cleanfast-backend.onrender.com/dispositivos/${nombre}`, {
      deviceId: nuevoId
    });
    cargarDispositivos();
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>Registro de Celular</h1>
      <p style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto 20px' }}>
        Bienvenido al sistema de registro de asistencia de empleados. Aquí deberás registrar <strong>únicamente el celular</strong> desde donde harás tus registros diarios de ingreso y salida. Este dispositivo será asociado a tu nombre y tienda. Para mayor seguridad, también se te pedirá una clave única entregada por tu supervisor.
      </p>

      <div>
        <select
          value={tiendaSeleccionada}
          onChange={(e) => setTiendaSeleccionada(e.target.value)}
        >
          <option value="">Selecciona tu tienda</option>
          {Object.keys(empleadosPorTienda).map((tienda) => (
            <option key={tienda} value={tienda}>{tienda}</option>
          ))}
        </select>
        <br /><br />

        {tiendaSeleccionada && (
          <select
            value={empleadoSeleccionado}
            onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
          >
            <option value="">Selecciona tu nombre</option>
            {empleadosPorTienda[tiendaSeleccionada].map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
        )}
        <br /><br />

        <input
          type="password"
          placeholder="Clave de seguridad"
          value={claveSeguridad}
          onChange={(e) => setClaveSeguridad(e.target.value)}
        />
        <br /><br />

        <button onClick={registrar}>Registrar mi celular</button>

        {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      <hr style={{ margin: '40px 0' }} />

      <button onClick={() => {
        setModoAdmin(!modoAdmin);
        if (!modoAdmin) cargarDispositivos();
      }}>
        {modoAdmin ? 'Cerrar modo administrador' : 'Entrar como administrador'}
      </button>

      {modoAdmin && (
        <div style={{ marginTop: '20px' }}>
          <h2>Administración de Dispositivos</h2>
          <table style={{ margin: 'auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Device ID</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dispositivos.map((d) => (
                <tr key={d.nombre}>
                  <td>{d.nombre}</td>
                  <td>
                    <input
                      value={d.id}
                      onChange={(e) => {
                        const nuevos = dispositivos.map((item) =>
                          item.nombre === d.nombre ? { ...item, id: e.target.value } : item
                        );
                        setDispositivos(nuevos);
                      }}
                      style={{ width: '300px' }}
                    />
                  </td>
                  <td>
                    <button onClick={() => actualizar(d.nombre, d.id)}>💾</button>
                    <button onClick={() => eliminar(d.nombre)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
