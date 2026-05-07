import { useState, useEffect } from 'react';
import { CONSULTORIOS_DISPONIBLES, MODULOS_DISPONIBLES } from '../utils/clinicaConstantes';
import { useCerebroDistribucion } from '../hooks/useCerebroDistribucion';
import { useAuth } from '../context/AuthContext';

export default function Panel() {
    const { perfil, logout } = useAuth(); // <-- Extraemos el perfil y la función de cierre

    const [miEspecialidad, setMiEspecialidad] = useState('');
    const [miModulo, setMiModulo] = useState('');
    const [especialidadTemp, setEspecialidadTemp] = useState('');
    const [moduloTemp, setModuloTemp] = useState('');

    // Autocompletar especialidad si el usuario NO es Administrador
    useEffect(() => {
        if (perfil && perfil.rol !== 'Administrador' && perfil.especialidad) {
            setEspecialidadTemp(perfil.especialidad);
        }
    }, [perfil]);

    const {
        consultoriosActivos,
        pacientesActuales,
        pacientesEnEsperaParaMi,
        getEspecialidadDestino,
        cambiarEstadoPaciente,
        llamarSiguienteAutomatico,
        bloquearMujeresRayosX, setBloquearMujeresRayosX,
        modoPruebaEsfuerzo, setModoPruebaEsfuerzo
    } = useCerebroDistribucion(miEspecialidad, miModulo);

    const ingresarAlPanel = (e) => {
        e.preventDefault();
        if (!especialidadTemp || !moduloTemp) { alert("Debe seleccionar un área y un módulo."); return; }
        setMiEspecialidad(especialidadTemp);
        setMiModulo(moduloTemp);
    };

    const salirDelPanel = async () => {
        if (window.confirm("¿Seguro que desea cerrar su sesión clínica y volver al Login?")) {
            await logout(); // <-- Esto cierra la sesión en Supabase y lo envía al Login
        }
    };

    const monitorDeConexion = (
        <div className="bg-gray-800 text-gray-300 text-xs p-3 rounded-xl border border-gray-700 shadow-inner w-full md:max-w-sm mt-4 md:mt-0">
            <p className="font-bold text-gray-100 uppercase mb-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                Red Clínica Activa
            </p>
            <div className="flex flex-wrap gap-1">
                {consultoriosActivos.length > 0 ? consultoriosActivos.map(c => <span key={c} className="bg-gray-700 px-2 py-1 rounded whitespace-nowrap">{c.split('(')[0].trim()}</span>) : <span className="text-gray-500 italic">No hay otros equipos conectados.</span>}
            </div>
        </div>
    );

    // --- PANTALLA 1: SELECCIÓN DE ÁREA (AHORA INTELIGENTE) ---
    if (!miEspecialidad || !miModulo) {
        // Evitar que la pantalla explote si el perfil aún se está descargando
        if (!perfil) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Cargando perfil...</div>;

        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full p-6 md:p-8 rounded-3xl shadow-xl text-center z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">¡Hola, {perfil.usuario_nombre}!</h1>
                    <p className="text-gray-500 mb-6 font-medium">Rol: {perfil.rol}</p>

                    <form onSubmit={ingresarAlPanel} className="space-y-4 text-left mt-4 md:mt-6">

                        {/* LÓGICA DE ROLES: Solo el admin puede elegir cualquier área */}
                        {perfil.rol === 'Administrador' ? (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Especialidad (Modo Admin):</label>
                                <select value={especialidadTemp} onChange={(e) => setEspecialidadTemp(e.target.value)} className="w-full border-2 border-gray-300 text-gray-800 text-base md:text-lg rounded-xl p-3" required>
                                    <option value="" disabled>-- Seleccione un área para supervisar --</option>
                                    {CONSULTORIOS_DISPONIBLES.map(cons => <option key={cons} value={cons}>{cons}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tu Especialidad Asignada:</label>
                                <input type="text" value={perfil.especialidad || 'No asignada'} className="w-full border-2 border-gray-300 bg-gray-100 text-gray-600 text-base md:text-lg rounded-xl p-3 cursor-not-allowed font-bold" disabled />
                            </div>
                        )}

                        {/* Todos, sin importar el rol, deben elegir en qué puerta física están sentados hoy */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">¿En qué módulo te encuentras hoy?</label>
                            <select value={moduloTemp} onChange={(e) => setModuloTemp(e.target.value)} className="w-full border-2 border-gray-300 text-gray-800 text-base md:text-lg rounded-xl p-3" required>
                                <option value="" disabled>-- Seleccione su ubicación --</option>
                                {MODULOS_DISPONIBLES.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold text-lg md:text-xl py-3 mt-4 rounded-xl hover:bg-blue-700 shadow-md transition-transform active:scale-95">Ingresar al Tablero</button>
                    </form>
                </div>
            </div>
        );
    }

    // Extracción del paciente actual (para áreas estándar que solo ven 1 a la vez)
    const primerPacienteActivo = pacientesActuales.length > 0 ? pacientesActuales[0] : null;

    // --- VISTA EXCLUSIVA PARA PSICOLOGÍA (TABLERO KANBAN) ---
    if (miEspecialidad === "PSICOLOGIA (1er Piso)") {
        const enSalaPruebas = pacientesActuales.filter(p => p.estado === 'LLAMANDO' || p.estado === 'EN_ATENCION');
        const enEntrevista = pacientesActuales.filter(p => p.estado === 'EN_ENTREVISTA');

        return (
            <div className="min-h-screen bg-gray-100 p-4 font-sans">
                <header className="mb-6 bg-purple-900 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black">{getEspecialidadDestino()}</h1>
                        <p className="text-sm font-medium text-purple-200 mt-1">📍 {miModulo} (Modo Sala Múltiple)</p>
                    </div>
                    <button onClick={salirDelPanel} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded border border-white/20">Cerrar Sesión</button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUMNA 1: COLA EXTERNA */}
                    <div className="bg-white rounded-2xl shadow p-4 border-t-4 border-gray-400">
                        <h2 className="font-bold text-gray-700 mb-4 flex justify-between">
                            En Cola General <span className="bg-gray-200 text-gray-700 px-2 rounded-full">{pacientesEnEsperaParaMi.length}</span>
                        </h2>
                        <button onClick={llamarSiguienteAutomatico} disabled={pacientesEnEsperaParaMi.length === 0} className="w-full mb-4 bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                            Llamar Siguiente a la Sala
                        </button>
                        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
                            {pacientesEnEsperaParaMi.map(p => (
                                <div key={p.id_mediweb} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    <p className="font-bold text-gray-800">{p.nombre_paciente}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA 2: EN SALA DE PRUEBAS */}
                    <div className="bg-white rounded-2xl shadow p-4 border-t-4 border-orange-400">
                        <h2 className="font-bold text-gray-700 mb-4 flex justify-between">
                            Resolviendo Pruebas <span className="bg-orange-100 text-orange-700 px-2 rounded-full">{enSalaPruebas.length}</span>
                        </h2>
                        <div className="space-y-3 overflow-y-auto max-h-[70vh]">
                            {enSalaPruebas.map(p => (
                                <div key={p.id_mediweb} className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                    <p className="font-bold text-gray-800 mb-1">{p.nombre_paciente}</p>
                                    <p className="text-xs text-orange-600 font-bold mb-3">Estado: {p.estado === 'LLAMANDO' ? 'Llamado en TV...' : 'En Sala'}</p>
                                    <div className="flex gap-2">
                                        {p.estado === 'LLAMANDO' && (
                                            <button onClick={() => cambiarEstadoPaciente(p, 'EN_ATENCION')} className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg">Entró a Sala</button>
                                        )}
                                        <button onClick={() => cambiarEstadoPaciente(p, 'EN_ENTREVISTA')} className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg">Llamar a Entrevista</button>
                                    </div>
                                </div>
                            ))}
                            {enSalaPruebas.length === 0 && <p className="text-sm text-gray-400 text-center italic mt-10">No hay pacientes rindiendo pruebas.</p>}
                        </div>
                    </div>

                    {/* COLUMNA 3: EN ENTREVISTA PERSONAL */}
                    <div className="bg-white rounded-2xl shadow p-4 border-t-4 border-purple-600">
                        <h2 className="font-bold text-gray-700 mb-4 flex justify-between">
                            En Entrevista <span className="bg-purple-100 text-purple-700 px-2 rounded-full">{enEntrevista.length}</span>
                        </h2>
                        <div className="space-y-3 overflow-y-auto max-h-[70vh]">
                            {enEntrevista.map(p => (
                                <div key={p.id_mediweb} className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
                                    <p className="font-black text-gray-800 text-lg mb-4">{p.nombre_paciente}</p>
                                    <button onClick={() => cambiarEstadoPaciente(p, 'ESPERA')} className="w-full text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow">Finalizar Evaluación</button>
                                </div>
                            ))}
                            {enEntrevista.length === 0 && <p className="text-sm text-gray-400 text-center italic mt-10">Ningún paciente en entrevista.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VISTA ESTÁNDAR (EL SEMÁFORO GIGANTE PARA EL RESTO DE ÁREAS) ---
    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden">
            {/* ... (Cabecera estándar) ... */}
            <header className={`mb-6 md:mb-8 text-white p-4 md:p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center transition-colors ${modoPruebaEsfuerzo ? 'bg-purple-900' : 'bg-blue-900'}`}>
                <div className="w-full flex justify-between items-start md:w-auto md:block">
                    <div><h1 className="text-xl sm:text-2xl md:text-3xl font-black truncate pr-2">{getEspecialidadDestino()}</h1><p className="text-sm md:text-base font-medium text-blue-200 mt-1">📍 {miModulo}</p></div>
                    <button onClick={salirDelPanel} className="mt-1 md:mt-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 md:py-1 rounded transition-colors border border-white/20">Cerrar Sesión</button>
                </div>
                {monitorDeConexion}
            </header>

            {/* --- SEMÁFORO PRINCIPAL ESTÁNDAR --- */}
            <div className="max-w-4xl mx-auto mb-8 md:mb-12">
                {!primerPacienteActivo ? (
                    <div className={`bg-white border-4 rounded-3xl p-6 md:p-10 text-center shadow-xl transform transition-all ${modoPruebaEsfuerzo ? 'border-purple-400' : 'border-green-400'}`}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 mb-2">Módulo Libre</h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-500 mb-6 md:mb-8">Hay <strong className={modoPruebaEsfuerzo ? "text-purple-600" : "text-green-600"}>{pacientesEnEsperaParaMi.length}</strong> pacientes esperando a {getEspecialidadDestino().split('(')[0].trim()}.</p>
                        <button onClick={llamarSiguienteAutomatico} disabled={pacientesEnEsperaParaMi.length === 0} className={`w-full px-4 py-4 md:px-12 md:py-5 rounded-2xl font-black text-lg sm:text-xl md:text-2xl shadow-lg transition-transform active:scale-95 ${pacientesEnEsperaParaMi.length > 0 ? (modoPruebaEsfuerzo ? 'bg-purple-600 text-white animate-pulse' : 'bg-green-500 text-white animate-pulse') : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                            LLAMAR SIGUIENTE
                        </button>
                    </div>
                ) : primerPacienteActivo.estado === 'LLAMANDO' ? (
                    <div className="bg-white border-4 border-orange-400 rounded-3xl p-6 md:p-10 text-center shadow-xl">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-500 uppercase tracking-widest mb-2">Llamando por TV a:</h2>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-800 mb-2">{primerPacienteActivo.nombre_paciente}</h1>
                        <button onClick={() => cambiarEstadoPaciente(primerPacienteActivo, 'EN_ATENCION')} className="mt-6 w-full px-4 py-4 md:px-12 md:py-5 bg-orange-500 text-white rounded-2xl font-black text-lg md:text-2xl shadow-lg transition-transform active:scale-95">INGRESÓ (INICIAR)</button>
                    </div>
                ) : (
                    <div className="bg-white border-4 border-red-500 rounded-3xl p-6 md:p-10 text-center shadow-xl">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-500 uppercase tracking-widest mb-2">Atendiendo a:</h2>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-800 mb-2">{primerPacienteActivo.nombre_paciente}</h1>
                        <button onClick={() => cambiarEstadoPaciente(primerPacienteActivo, 'ESPERA')} className="mt-6 w-full px-4 py-4 md:px-12 md:py-5 bg-red-600 text-white rounded-2xl font-black text-lg md:text-2xl shadow-lg transition-transform active:scale-95">FINALIZAR CONSULTA</button>
                    </div>
                )}
            </div>
        </div>
    );
}