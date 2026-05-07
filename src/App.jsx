import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Panel from './pages/Panel';
import TV from './pages/TV';
import Paciente from './pages/Paciente';

// Componente Guardián que bloquea el paso si no estás logueado
const RutaProtegida = ({ children }) => {
  const { session, cargandoAuth } = useAuth();

  if (cargandoAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><h1 className="text-xl font-bold text-gray-500 animate-pulse">Cargando sistema...</h1></div>;
  if (!session) return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/panel" element={<RutaProtegida><Panel /></RutaProtegida>} />

          {/* Añade estas dos rutas para que no te den pantalla en blanco */}
          <Route path="/tv" element={<TV />} />
          <Route path="/paciente" element={<Paciente />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;