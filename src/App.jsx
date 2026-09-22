import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './views/Dashboard.jsx';
import StockView from './views/StockView.jsx';
import LoginView from './views/LoginView.jsx';
import PedidosView from './views/PedidosView.jsx';
import Placeholder from './views/Placeholder.jsx';
import ClientesView from './views/ClientesView.jsx';
import KitsView from './views/KitsView.jsx';
import CalculadoraView from './views/CalculadoraView.jsx';

// Componente para proteger las rutas privadas
function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Cargando sesión...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      {/* Ruta pública para iniciar sesión */}
      <Route 
        path="/login" 
        element={usuario ? <Navigate to="/dashboard" replace /> : <LoginView />} 
      />

      {/* Rutas protegidas por sesión de usuario */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stock"     element={<StockView />} />
        <Route path="/pedidos"   element={<PedidosView />} />
        <Route path="/agenda"    element={<Placeholder titulo="Agenda" />} />
        <Route path="/clientes"  element={<ClientesView />} />
        <Route path="/kits"      element={<KitsView />} /> {/* cambio de prueba */}
        <Route path="/calculadora" element={<CalculadoraView />} />
        <Route path="/compras"   element={<Placeholder titulo="Compras" />} />
        <Route path="/reportes"  element={<Placeholder titulo="Reportes" />} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}