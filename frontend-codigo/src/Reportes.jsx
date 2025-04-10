import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Reportes() {
  const [tipo, setTipo] = useState('tienda');
  const [fecha, setFecha] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tienda, setTienda] = useState('');
  const [empleado, setEmpleado] = useState('');
  const [resultados, setResultados] = useState([]);

  const tiendas = [
    'Tienda Bangkok',
    'Tienda Alcaldía',
    'Tienda EPM',
    'Tienda Washington'
  ];

  const obtenerReportes = async () => {
    let url = `https://cleanfast-backend.onrender.com/reportes?tipo=${tipo}`;
    if (fecha) url += `&fecha=${fecha}`;
    if (desde && hasta) url += `&desde=${desde}&hasta=${hasta}`;
    if (tienda) url += `&tienda=${encodeURIComponent(tienda)}`;
    if (empleado) url += `&empleado=${encodeURIComponent(empleado)}`;

    const res = await axios.get(url);
    setResultados(Array.isArray(res.data) ? res.data : Object.entries(res.data));
  };

  const formatearFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} - ${hh}:${min}`;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Reportes del sistema</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Tipo de reporte: </label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="tienda">Por tienda</option>
          <option value="empleado">Por empleado</option>
          <option value="rango">Por rango de fechas</option>
          <option value="resumen">Ejecutivo</option>
        </select>
      </div>

      {tipo === 'tienda' && (
        <>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <select value={tienda} onChange={(e) => setTienda(e.target.value)}>
            <option value="">Selecciona una tienda</option>
            {tiendas.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
        </>
      )}

      {tipo === 'empleado' && (
        <>
          <input type="text" placeholder="Nombre empleado" value={empleado} onChange={(e) => setEmpleado(e.target.value)} />
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </>
      )}

      {tipo === 'rango' && (
        <>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </>
      )}

      <br /><br />
      <button onClick={obtenerReportes}>Consultar</button>

      <table border="1" cellPadding="5" style={{ marginTop: 20, width: '100%' }}>
        <thead>
          <tr>
            {tipo !== 'resumen' ? (
              <>
                <th>Fecha</th><th>Empleado</th><th>Tipo</th><th>Tienda</th>
              </>
            ) : (
              <>
                <th>Tienda</th><th># Registros</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {resultados.map((r, idx) => (
            <tr key={idx}>
              {tipo !== 'resumen' ? (
                <>
                  <td>{formatearFecha(r.timestamp)}</td>
                  <td>{r.nombre}</td>
                  <td>{r.tipo}</td>
                  <td>{r.tienda}</td>
                </>
              ) : (
                <>
                  <td>{r[0]}</td>
                  <td>{r[1].registros}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 
