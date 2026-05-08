import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Panel from './pages/Panel';
import TV from './pages/TV';
import Paciente from './pages/Paciente';
import AdminUsuarios from './pages/AdminUsuarios';

const RutaProtegida = ({ children }) => {
  const { session, cargandoAuth } = useAuth();
  if (cargandoAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><h1 className="text-xl font-bold text-gray-500 animate-pulse">Cargando sistema...</h1></div>;
  if (!session) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* ==========================================
            RUTAS PÚBLICAS (Aisladas del AuthContext)
            Estas pantallas ya no causarán conflictos.
        =========================================== */}
        <Route path="/tv" element={<TV />} />
        <Route path="/paciente" element={<Paciente />} />

        {/* ==========================================
            RUTAS PRIVADAS (Protegidas por AuthProvider)
        =========================================== */}
        <Route path="/*" element={
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/inicio" element={<RutaProtegida><Inicio /></RutaProtegida>} />
              <Route path="/panel" element={<RutaProtegida><Panel /></RutaProtegida>} />
              <Route path="/admin-usuarios" element={<RutaProtegida><AdminUsuarios /></RutaProtegida>} />
            </Routes>
          </AuthProvider>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;