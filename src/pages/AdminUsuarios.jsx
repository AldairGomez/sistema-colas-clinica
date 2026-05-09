import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CONSULTORIOS_DISPONIBLES } from '../utils/clinicaConstantes';
import { Link } from 'react-router-dom';

export default function AdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [nuevoUsuario, setNuevoUsuario] = useState({
        email: '',
        password: '',
        username: '',
        nombre: '',
        rol: 'Especialista',
        especialidad: ''
    });

    // Estados para Modales
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [usuarioCambiandoPass, setUsuarioCambiandoPass] = useState(null);
    const [nuevaPass, setNuevaPass] = useState('');

    // --- ESTADOS PARA LOS FILTROS ---
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS'); // TODOS, ACTIVO, INACTIVO

    useEffect(() => { fetchUsuarios(); }, []);

    const fetchUsuarios = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .order('activo', { ascending: false })
            .order('usuario_nombre', { ascending: true });
        if (!error) setUsuarios(data);
        setCargando(false);
    };

    // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
    const usuariosFiltrados = usuarios.filter(u => {
        const coincideNombre = u.usuario_nombre.toLowerCase().includes(filtroNombre.toLowerCase()) ||
            (u.usuario && u.usuario.toLowerCase().includes(filtroNombre.toLowerCase()));

        const coincideRol = filtroRol === '' ? true : u.rol === filtroRol;
        const coincideArea = filtroArea === '' ? true : u.especialidad === filtroArea;

        const coincideEstado = filtroEstado === 'TODOS' ? true :
            filtroEstado === 'ACTIVO' ? u.activo === true :
                u.activo === false;

        return coincideNombre && coincideRol && coincideArea && coincideEstado;
    });

    // --- FUNCIÓN PARA LIMPIAR FILTROS ---
    const limpiarFiltros = () => {
        setFiltroNombre('');
        setFiltroRol('');
        setFiltroArea('');
        setFiltroEstado('TODOS');
    };

    const handleCrearPerfil = async (e) => {
        e.preventDefault();
        setCargando(true);
        const { error } = await supabase.rpc('crear_nuevo_personal_clinica', {
            p_email: nuevoUsuario.email,
            p_password: nuevoUsuario.password,
            p_nombre: nuevoUsuario.nombre,
            p_rol: nuevoUsuario.rol,
            p_especialidad: nuevoUsuario.rol === 'Administrador' ? null : nuevoUsuario.especialidad,
            p_usuario: nuevoUsuario.username
        });
        if (error) alert("Error al crear usuario: " + error.message);
        else {
            alert(`¡Éxito! Usuario ${nuevoUsuario.username} creado correctamente.`);
            setNuevoUsuario({ email: '', password: '', username: '', nombre: '', rol: 'Especialista', especialidad: '' });
            fetchUsuarios();
        }
        setCargando(false);
    };

    const handleGuardarEdicion = async (e) => {
        e.preventDefault();
        setCargando(true);
        const { error } = await supabase.rpc('editar_personal_clinica', {
            p_id: usuarioEditando.id,
            p_nombre: usuarioEditando.usuario_nombre,
            p_rol: usuarioEditando.rol,
            p_especialidad: usuarioEditando.rol === 'Administrador' ? null : usuarioEditando.especialidad,
            p_usuario: usuarioEditando.usuario,
            p_correo: usuarioEditando.correo
        });
        if (error) alert("Error al actualizar: " + error.message);
        else {
            alert("Perfil actualizado correctamente.");
            setUsuarioEditando(null);
            fetchUsuarios();
        }
        setCargando(false);
    };

    const handleGuardarPassword = async (e) => {
        e.preventDefault();
        if (nuevaPass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
        setCargando(true);
        const { error } = await supabase.rpc('cambiar_password_personal', {
            p_id: usuarioCambiandoPass.id,
            p_password: nuevaPass
        });
        if (error) alert("Error al cambiar contraseña: " + error.message);
        else {
            alert("Contraseña cambiada exitosamente.");
            setUsuarioCambiandoPass(null);
            setNuevaPass('');
        }
        setCargando(false);
    };

    const handleCambiarEstado = async (id, nombre, estadoActual) => {
        const accion = estadoActual ? "INHABILITAR" : "HABILITAR";
        if (window.confirm(`¿Estás seguro de que deseas ${accion} el acceso de ${nombre}?`)) {
            const { error } = await supabase.rpc('alternar_estado_personal', {
                p_id: id, p_activo: !estadoActual
            });
            if (error) alert("Error: " + error.message);
            else fetchUsuarios();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-gray-800">Gestión de Personal</h1>
                    <Link to="/inicio" className="text-blue-600 font-bold hover:underline">← Volver al Inicio</Link>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* COLUMNA 1: FORMULARIO DE CREACIÓN */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-2xl">👤</span> Nuevo Perfil</h2>
                        <form onSubmit={handleCrearPerfil} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
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
                                    value={nuevoUsuario.nombre}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Rol</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}>
                                    <option value="Especialista">Especialista (Médico)</option>
                                    <option value="Practicante">Practicante / Auxiliar</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                            {nuevoUsuario.rol !== 'Administrador' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Área Asignada</label>
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={nuevoUsuario.especialidad} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, especialidad: e.target.value })} required>
                                        <option value="">-- Seleccionar Área --</option>
                                        {CONSULTORIOS_DISPONIBLES.map(area => (<option key={area} value={area}>{area}</option>))}
                                    </select>
                                </div>
                            )}
                            <button type="submit" disabled={cargando} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 mt-4 disabled:bg-blue-300 transition-colors shadow-lg shadow-blue-200">Crear Perfil</button>
                        </form>
                    </div>

                    {/* COLUMNA 2: TABLA Y FILTROS */}
                    <div className="xl:col-span-2">

                        {/* --- BARRA DE FILTROS ACTUALIZADA --- */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Buscar por Nombre o Usuario</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Juan, dr.perez..."
                                    className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 transition-colors"
                                    value={filtroNombre}
                                    onChange={(e) => setFiltroNombre(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Rol</label>
                                <select className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 cursor-pointer" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
                                    <option value="">Todos</option>
                                    <option value="Administrador">Administrador</option>
                                    <option value="Especialista">Especialista</option>
                                    <option value="Practicante">Practicante</option>
                                </select>
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Área</label>
                                <select className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 cursor-pointer md:max-w-[180px]" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
                                    <option value="">Todas</option>
                                    {CONSULTORIOS_DISPONIBLES.map(area => (<option key={area} value={area}>{area}</option>))}
                                </select>
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Estado</label>
                                <select className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 cursor-pointer" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                                    <option value="TODOS">Todos</option>
                                    <option value="ACTIVO">Solo Activos</option>
                                    <option value="INACTIVO">Solo Inactivos</option>
                                </select>
                            </div>
                            {/* BOTÓN LIMPIAR FILTROS */}
                            <div className="w-full md:w-auto">
                                <button
                                    onClick={limpiarFiltros}
                                    className="w-full md:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-200"
                                    title="Limpiar todos los filtros"
                                >
                                    <span>🔄</span> Limpiar
                                </button>
                            </div>
                        </div>
                        {/* ------------------------ */}

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-600">Personal</th>
                                        <th className="p-4 font-bold text-gray-600">Estado</th>
                                        <th className="p-4 font-bold text-gray-600">Rol</th>
                                        <th className="p-4 font-bold text-gray-600">Área</th>
                                        <th className="p-4 font-bold text-center text-gray-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? <tr><td colSpan="5" className="p-8 text-center text-gray-400">Cargando...</td></tr> :
                                        usuariosFiltrados.length === 0 ? (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">No se encontraron usuarios que coincidan con los filtros.</td></tr>
                                        ) :
                                            usuariosFiltrados.map(u => (
                                                <tr key={u.id} className={`border-b border-gray-50 transition-colors ${!u.activo ? 'bg-red-50/50 opacity-75' : 'hover:bg-blue-50/30'}`}>
                                                    <td className="p-4 font-bold text-gray-700">
                                                        {u.usuario_nombre}<br /><span className="text-xs font-normal text-gray-400">@{u.usuario} | {u.correo}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-md text-xs font-black ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {u.activo ? 'ACTIVO' : 'INACTIVO'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-bold text-gray-600">{u.rol}</td>
                                                    <td className="p-4 text-gray-500 text-sm truncate max-w-[150px]">{u.especialidad || '-'}</td>
                                                    <td className="p-4 text-center space-x-2">
                                                        <button onClick={() => setUsuarioEditando(u)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg font-bold transition-colors" title="Editar Perfil">✏️</button>
                                                        <button onClick={() => setUsuarioCambiandoPass(u)} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white p-2 rounded-lg font-bold transition-colors" title="Cambiar Contraseña">🔑</button>
                                                        <button onClick={() => handleCambiarEstado(u.id, u.usuario_nombre, u.activo)} className={`${u.activo ? 'bg-red-50 text-red-600 hover:bg-red-600' : 'bg-green-50 text-green-600 hover:bg-green-600'} hover:text-white p-2 rounded-lg font-bold transition-colors`} title={u.activo ? "Inhabilitar" : "Habilitar"}>
                                                            {u.activo ? '❌' : '✅'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL: EDITAR USUARIO */}
                {usuarioEditando && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <h2 className="text-2xl font-black mb-6">Editar Perfil</h2>
                            <form onSubmit={handleGuardarEdicion} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                            value={usuarioEditando.usuario || ''}
                                            onChange={(e) => setUsuarioEditando({ ...usuarioEditando, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo</label>
                                        <input
                                            type="email"
                                            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500"
                                            value={usuarioEditando.correo || ''}
                                            onChange={(e) => setUsuarioEditando({ ...usuarioEditando, correo: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                                    <input type="text" className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={usuarioEditando.usuario_nombre} onChange={(e) => setUsuarioEditando({ ...usuarioEditando, usuario_nombre: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Rol</label>
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={usuarioEditando.rol} onChange={(e) => setUsuarioEditando({ ...usuarioEditando, rol: e.target.value })}>
                                        <option value="Especialista">Especialista</option>
                                        <option value="Practicante">Practicante</option>
                                        <option value="Administrador">Administrador</option>
                                    </select>
                                </div>
                                {usuarioEditando.rol !== 'Administrador' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Área Asignada</label>
                                        <select className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" value={usuarioEditando.especialidad || ''} onChange={(e) => setUsuarioEditando({ ...usuarioEditando, especialidad: e.target.value })} required>
                                            <option value="">-- Seleccionar --</option>
                                            {CONSULTORIOS_DISPONIBLES.map(area => (<option key={area} value={area}>{area}</option>))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-4 mt-6">
                                    <button type="button" onClick={() => setUsuarioEditando(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={cargando} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: CAMBIAR CONTRASEÑA */}
                {usuarioCambiandoPass && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
                            <div className="text-4xl mb-4">🔑</div>
                            <h2 className="text-xl font-black mb-2">Nueva Contraseña</h2>
                            <p className="text-gray-500 text-sm mb-6">Para: <strong>{usuarioCambiandoPass.usuario_nombre}</strong></p>
                            <form onSubmit={handleGuardarPassword}>
                                <input type="password" placeholder="Mínimo 6 caracteres" className="w-full p-4 border-2 rounded-xl bg-gray-50 mb-6 text-center text-lg tracking-widest outline-none focus:border-orange-500" value={nuevaPass} onChange={(e) => setNuevaPass(e.target.value)} required />
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => { setUsuarioCambiandoPass(null); setNuevaPass(''); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={cargando} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors">Actualizar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}