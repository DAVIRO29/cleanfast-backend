// src/RegistroCel.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function RegistroCel() {
  const [deviceId, setDeviceId] = useState('');
  const [nombre, setNombre] = useState('');
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
    try {
      const res = await axios.post('https://cleanfast-backend.onrender.com/registrar-dispositivo', {
        nombre,
        deviceId,
      });
      setMensaje(res.data.mensaje);
      setError('');
      setNombre('');
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
      <h1>Registro de Dispositivo</h1>
      <p><strong>Tu deviceId es:</strong> {deviceId}</p>

      <input
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <button onClick={registrar}>Registrar</button>

      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

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
