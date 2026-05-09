// src/pages/AdminUsuarios.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CONSULTORIOS_DISPONIBLES } from '../utils/clinicaConstantes';
import { Link } from 'react-router-dom';

export default function AdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Estado para el formulario de nuevo usuario
    const [nuevoUsuario, setNuevoUsuario] = useState({
        email: '',
        password: '',
        username: '',
        nombre: '',
        rol: 'Especialista',
        especialidad: ''
    });

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .order('usuario_nombre', { ascending: true });

        if (!error) setUsuarios(data);
        setCargando(false);
    };


    // Dentro de AdminUsuarios.jsx
    const handleCrearPerfil = async (e) => {
        e.preventDefault();
        setCargando(true);

        const { data, error } = await supabase.rpc('crear_nuevo_personal_clinica', {
            p_email: nuevoUsuario.email,
            p_password: nuevoUsuario.password,
            p_nombre: nuevoUsuario.nombre,
            p_rol: nuevoUsuario.rol,
            p_especialidad: nuevoUsuario.rol === 'Administrador' ? null : nuevoUsuario.especialidad,
            p_usuario: nuevoUsuario.username
        });

        if (error) {
            alert("Error al crear usuario: " + error.message);
        } else {
            alert(`¡Éxito! Usuario ${nuevoUsuario.username} creado correctamente.`);
            setNuevoUsuario({ email: '', password: '', username: '', nombre: '', rol: 'Especialista', especialidad: '' });
            fetchUsuarios();
        }
        setCargando(false);
    };

    const handleDarDeBaja = async (id, nombre) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el acceso de ${nombre}?`)) {
            const { error } = await supabase
                .from('perfiles')
                .delete()
                .eq('id', id);

            if (error) alert("Error: " + error.message);
            else fetchUsuarios();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-gray-800">Gestión de Personal</h1>
                    <Link to="/inicio" className="text-blue-600 font-bold hover:underline">← Volver al Inicio</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA 1: FORMULARIO DE REGISTRO */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-2xl">👤</span> Registrar Nuevo Perfil
                        </h2>

                        <form onSubmit={handleCrearPerfil} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Usuario (ej. dr.perez)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                        placeholder="dr.perez"
                                        value={nuevoUsuario.username}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                        placeholder="••••••••"
                                        value={nuevoUsuario.password}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                    placeholder="correo@clinica.com"
                                    value={nuevoUsuario.email}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                    placeholder="Ej. Dr. Juan Pérez"
                                    value={nuevoUsuario.nombre}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Rol en la Clínica</label>
                                <select
                                    className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                    value={nuevoUsuario.rol}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                                >
                                    <option value="Especialista">Especialista (Médico)</option>
                                    <option value="Practicante">Practicante / Auxiliar</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>

                            {nuevoUsuario.rol !== 'Administrador' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Especialidad / Área</label>
                                    <select
                                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 font-medium"
                                        value={nuevoUsuario.especialidad}
                                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, especialidad: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Seleccionar Área --</option>
                                        {CONSULTORIOS_DISPONIBLES.map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button type="submit" disabled={cargando} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mt-4 disabled:bg-blue-300">
                                {cargando ? 'Creando...' : 'Guardar Perfil'}
                            </button>
                        </form>
                    </div>

                    {/* COLUMNA 2: LISTADO DE USUARIOS */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-600">Personal</th>
                                        <th className="p-4 font-bold text-gray-600">Rol</th>
                                        <th className="p-4 font-bold text-gray-600">Especialidad</th>
                                        <th className="p-4 font-bold text-center text-gray-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 animate-pulse">Cargando personal...</td></tr>
                                    ) : usuarios.length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay perfiles registrados.</td></tr>
                                    ) : (
                                        usuarios.map(u => (
                                            <tr key={u.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                                                <td className="p-4 font-bold text-gray-700">{u.usuario_nombre}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.rol === 'Administrador' ? 'bg-purple-100 text-purple-700' :
                                                        u.rol === 'Especialista' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {u.rol}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">
                                                    {u.especialidad || 'Gestión General'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleDarDeBaja(u.id, u.usuario_nombre)}
                                                        className="text-gray-300 hover:text-red-600 font-bold p-2 transition-colors"
                                                        title="Dar de baja"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}