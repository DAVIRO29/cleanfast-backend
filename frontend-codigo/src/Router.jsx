import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';             // 👈 ESTA LÍNEA ES CLAVE
import Reportes from './Reportes';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
    </BrowserRouter>
  );
}

