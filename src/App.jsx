import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import TV from './pages/TV'
import Panel from './pages/Panel'
import Paciente from './pages/Paciente'

// Esta es la pantalla de inicio ("Home") que verás al entrar a la raíz del proyecto
function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl md:text-5xl font-bold text-green-500 mb-8 text-center">
        Sistema de Colas Divino Niño
      </h1>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/panel" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold text-center transition-colors">
          👨‍⚕️ Entrar al Panel
        </Link>
        <Link to="/tv" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-xl font-semibold text-center transition-colors">
          📺 Abrir TV
        </Link>
        <Link to="/paciente?dni=demo" className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-semibold text-center transition-colors">
          📱 Vista Paciente
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tv" element={<TV />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/paciente" element={<Paciente />} />
      </Routes>
    </HashRouter>
  )
}

export default App