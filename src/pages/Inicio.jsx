// src/pages/Inicio.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Inicio() {
    const { perfil, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Cabecera del Dashboard */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border-l-8 border-blue-600">
                    <div className="text-center md:text-left mb-4 md:mb-0">
                        <h1 className="text-3xl font-black text-gray-800">Bienvenido, {perfil?.usuario_nombre}</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest mt-1">
                            {perfil?.rol} {perfil?.especialidad ? `| ${perfil.especialidad}` : ''}
                        </p>
                    </div>
                    <button onClick={logout} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm">
                        Cerrar Sesión
                    </button>
                </div>

                {/* Grid de Accesos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Botón: Panel de Especialista */}
                    <Link to="/panel" className="bg-blue-600 hover:bg-blue-700 text-white p-8 rounded-2xl shadow-lg transition-transform hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
                        <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">👨‍⚕️</span>
                        <h2 className="text-xl font-bold">Panel Médico</h2>
                        <p className="text-blue-200 mt-2 text-sm">Llamar pacientes y gestionar consultorios</p>
                    </Link>

                    {/* Botón: TV (Abre en otra pestaña con etiqueta nativa <a>) */}
                    <a href="#/tv" target="_blank" rel="noopener noreferrer" className="bg-purple-600 hover:bg-purple-700 text-white p-8 rounded-2xl shadow-lg transition-transform hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
                        <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">📺</span>
                        <h2 className="text-xl font-bold">Pantalla TV</h2>
                        <p className="text-purple-200 mt-2 text-sm">Visor de turnos para salas de espera</p>
                    </a>

                    {/* Botón: Portal Paciente (Abre en otra pestaña con etiqueta nativa <a>) */}
                    <a href="#/paciente" target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white p-8 rounded-2xl shadow-lg transition-transform hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
                        <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">📱</span>
                        <h2 className="text-xl font-bold">Portal Paciente</h2>
                        <p className="text-green-200 mt-2 text-sm">Simulador de ticket virtual</p>
                    </a>

                    {/* Botón: Admin (SOLO VISIBLE PARA ADMINISTRADORES) */}
                    {perfil?.rol === 'Administrador' && (
                        <Link to="/admin-usuarios" className="bg-gray-800 hover:bg-gray-900 text-white p-8 rounded-2xl shadow-lg transition-transform hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
                            <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">⚙️</span>
                            <h2 className="text-xl font-bold">Personal</h2>
                            <p className="text-gray-300 mt-2 text-sm">CRUD de usuarios y permisos</p>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}