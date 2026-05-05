import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const CONSULTORIOS_DISPONIBLES = [
    "TRIAJE (1er Piso)",
    "LABORATORIO (1er Piso)",
    "RAYOS X (1er Piso)",
    "NEUROLOGIA (1er Piso)",
    "PSICOSENSOMETRICO (1er Piso)",
    "PSICOLOGIA (1er Piso)",
    "MEDICINA (2do Piso)",
    "CARDIOLOGIA (2do Piso)",
    "PRUEBA DE ESFUERZO (2do Piso)",
    "OFTALMOLOGIA (2do Piso)",
    "AUDIOMETRIA (2do Piso)",
    "ODONTOLOGIA (2do Piso)",
    "ECOGRAFIA (2do Piso)",
    "ESPIROMETRIA (2do Piso)"
];

// Opciones genéricas para las puertas físicas
const MODULOS_DISPONIBLES = [
    "Consultorio 1",
    "Consultorio 2",
    "Consultorio 3",
    "Tópico Principal",
    "Módulo A",
    "Módulo B"
];

export default function Panel() {
    const [pacientes, setPacientes] = useState([]);
    const [cargando, setCargando] = useState(true);

    // --- AHORA GUARDAMOS ESPECIALIDAD Y MÓDULO FÍSICO ---
    const [miEspecialidad, setMiEspecialidad] = useState('');
    const [miModulo, setMiModulo] = useState('');

    const [especialidadTemp, setEspecialidadTemp] = useState('');
    const [moduloTemp, setModuloTemp] = useState('');

    const [bloquearMujeresRayosX, setBloquearMujeresRayosX] = useState(true);
    const [modoPruebaEsfuerzo, setModoPruebaEsfuerzo] = useState(false);
    const [consultoriosActivos, setConsultoriosActivos] = useState([]);

    useEffect(() => {
        const fetchPacientes = async () => {
            const { data, error } = await supabase
                .from('turnos_activos')
                .select('*')
                .order('id_mediweb', { ascending: true });

            if (!error) setPacientes(data || []);
            setCargando(false);
        };

        fetchPacientes();

        const turnosChannel = supabase
            .channel('tabla-turnos-panel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_activos' }, () => {
                fetchPacientes();
            })
            .subscribe();

        return () => supabase.removeChannel(turnosChannel);
    }, []);

    useEffect(() => {
        const presenceChannel = supabase.channel('room-presence', {
            // Usamos una key única por especialidad y módulo para que Supabase los diferencie
            config: { presence: { key: miEspecialidad ? `${miEspecialidad}-${miModulo}` : 'portal' } },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const activos = [];
                for (const key in state) {
                    state[key].forEach(presence => {
                        // El radar sigue funcionando a nivel de "Especialidad" (Para el embudo)
                        if (presence.especialidad) activos.push(presence.especialidad);
                        if (presence.modoPruebaEsfuerzo) activos.push("PRUEBA DE ESFUERZO (2do Piso)");
                    });
                }
                setConsultoriosActivos([...new Set(activos)]);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && miEspecialidad) {
                    await presenceChannel.track({
                        especialidad: miEspecialidad,
                        modulo: miModulo,
                        modoPruebaEsfuerzo: modoPruebaEsfuerzo,
                        onlineAt: new Date().toISOString(),
                    });
                }
            });

        return () => { supabase.removeChannel(presenceChannel); };
    }, [miEspecialidad, miModulo, modoPruebaEsfuerzo]);

    const ingresarAlPanel = (e) => {
        e.preventDefault();
        if (!especialidadTemp || !moduloTemp) { alert("Debe seleccionar un área y un módulo."); return; }
        setMiEspecialidad(especialidadTemp);
        setMiModulo(moduloTemp);
    };

    const salirDelPanel = () => {
        if (window.confirm("¿Seguro que desea cerrar su sesión en este consultorio?")) {
            setMiEspecialidad('');
            setMiModulo('');
            setEspecialidadTemp('');
            setModuloTemp('');
            setModoPruebaEsfuerzo(false);
        }
    };

    // La especialidad a la que estoy jalando pacientes de la cola
    const getEspecialidadDestino = () => {
        if (miEspecialidad === "CARDIOLOGIA (2do Piso)" && modoPruebaEsfuerzo) return "PRUEBA DE ESFUERZO (2do Piso)";
        return miEspecialidad;
    };

    // El texto exacto que aparecerá en la TV (Ej. "MEDICINA (2do Piso) - Consultorio 1")
    const getTextoParaTV = (destinoOverride = null) => {
        const area = destinoOverride || getEspecialidadDestino();
        // Limpiamos el texto para que la TV no diga "Consultorio 1 - Consultorio 1"
        const nombreAreaLimpia = area.split('(')[0].trim();
        return `${nombreAreaLimpia} - ${miModulo}`;
    };

    const cambiarEstadoPaciente = async (idMediweb, nuevoEstado, destinoOverride = null) => {
        let tvTexto = null;
        if (nuevoEstado !== 'ESPERA') {
            tvTexto = getTextoParaTV(destinoOverride);
        }
        const { error } = await supabase.from('turnos_activos').update({ estado: nuevoEstado, consultorio_actual: tvTexto }).eq('id_mediweb', idMediweb);
        if (error) alert("Error de conexión: " + error.message);
    };

    const obtenerColaVirtual = (area) => {
        return pacientes.filter(p => {
            if (p.estado !== 'ESPERA') return false;
            const pends = typeof p.consultorios_pendientes === 'string' ? p.consultorios_pendientes.replace(/^{|}$/g, '').split(',').map(x => x.replace(/"/g, '').trim()) : p.consultorios_pendientes || [];
            if (pends.includes("LABORATORIO (1er Piso)") && area !== "LABORATORIO (1er Piso)") return false;
            return pends.includes(area);
        });
    };

    const llamarSiguienteAutomatico = () => {
        const miDestinoVirtual = getEspecialidadDestino();
        const pacientesEnEsperaParaMi = obtenerColaVirtual(miDestinoVirtual);

        if (pacientesEnEsperaParaMi.length === 0) {
            alert(`No hay pacientes esperando para ${miDestinoVirtual} en este momento.`);
            return;
        }

        let candidatosValidos = [];

        for (let i = 0; i < pacientesEnEsperaParaMi.length; i++) {
            const p = pacientesEnEsperaParaMi[i];
            const edadNum = parseInt(p.edad) || 0;
            const sexo = (p.sexo || "").toUpperCase();
            const pendientesArray = typeof p.consultorios_pendientes === 'string'
                ? p.consultorios_pendientes.replace(/^{|}$/g, '').split(',').map(x => x.replace(/"/g, '').trim())
                : p.consultorios_pendientes || [];

            if (miDestinoVirtual === "RAYOS X (1er Piso)" && (sexo === 'F' || sexo === 'FEMENINO') && bloquearMujeresRayosX) continue;
            if (miDestinoVirtual === "ESPIROMETRIA (2do Piso)" && edadNum > 40 && pendientesArray.includes("AUDIOMETRIA (2do Piso)")) continue;

            const requiereTriaje = pendientesArray.includes("TRIAJE (1er Piso)");
            if (requiereTriaje && miDestinoVirtual !== "TRIAJE (1er Piso)") {
                if (miDestinoVirtual === "RAYOS X (1er Piso)") {
                    if (consultoriosActivos.includes("TRIAJE (1er Piso)")) {
                        const colaTriaje = obtenerColaVirtual("TRIAJE (1er Piso)").length;
                        if (colaTriaje < 3) continue;
                    }
                } else {
                    continue;
                }
            }
            candidatosValidos.push(p);
        }

        if (candidatosValidos.length === 0) {
            alert("Los pacientes están retenidos por reglas médicas (Falta Triaje, o Triaje tiene prioridad).");
            return;
        }

        let pacienteElegido = null;
        for (let p of candidatosValidos) {
            let esElSiguienteEnOtraArea = false;
            const pendientesArray = typeof p.consultorios_pendientes === 'string' ? p.consultorios_pendientes.replace(/^{|}$/g, '').split(',').map(x => x.replace(/"/g, '').trim()) : p.consultorios_pendientes || [];
            for (let otraArea of pendientesArray) {
                if (otraArea !== miDestinoVirtual && consultoriosActivos.includes(otraArea)) {
                    const colaOtraArea = obtenerColaVirtual(otraArea);
                    if (colaOtraArea.length > 0 && colaOtraArea[0].id_mediweb === p.id_mediweb) {
                        esElSiguienteEnOtraArea = true; break;
                    }
                }
            }
            if (!esElSiguienteEnOtraArea) { pacienteElegido = p; break; }
        }

        if (!pacienteElegido) pacienteElegido = candidatosValidos[0];

        // Llamamos usando el destino virtual (para que la TV forme el texto correcto)
        cambiarEstadoPaciente(pacienteElegido.id_mediweb, 'LLAMANDO', miDestinoVirtual);
    };

    // Buscar al paciente aislando ESTRICTAMENTE mi especialidad Y mi puerta física
    const pacienteActual = pacientes.find(p => {
        if (p.estado !== 'LLAMANDO' && p.estado !== 'EN_ATENCION') return false;

        const textoTVEsperadoCardio = getTextoParaTV("CARDIOLOGIA (2do Piso)");
        const textoTVEsperadoEsfuerzo = getTextoParaTV("PRUEBA DE ESFUERZO (2do Piso)");
        const textoTVEsperadoNormal = getTextoParaTV(miEspecialidad);

        if (miEspecialidad === "CARDIOLOGIA (2do Piso)") {
            return p.consultorio_actual === textoTVEsperadoCardio || p.consultorio_actual === textoTVEsperadoEsfuerzo;
        }

        return p.consultorio_actual === textoTVEsperadoNormal;
    });

    const monitorDeConexion = (
        <div className="bg-gray-800 text-gray-300 text-xs p-3 rounded-xl border border-gray-700 shadow-inner w-full md:max-w-sm mt-4 md:mt-0">
            <p className="font-bold text-gray-100 uppercase mb-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                Red Clínica Activa
            </p>
            <div className="flex flex-wrap gap-1">
                {consultoriosActivos.length > 0
                    ? consultoriosActivos.map(c => <span key={c} className="bg-gray-700 px-2 py-1 rounded whitespace-nowrap">{c.split('(')[0].trim()}</span>)
                    : <span className="text-gray-500 italic">No hay otros equipos conectados.</span>
                }
            </div>
        </div>
    );

    // --- PANTALLA 1: LOGIN (ACTUALIZADO) ---
    if (!miEspecialidad || !miModulo) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full p-6 md:p-8 rounded-3xl shadow-xl text-center z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Portal Médico</h1>
                    <form onSubmit={ingresarAlPanel} className="space-y-4 text-left mt-6 md:mt-8">

                        {/* INPUT 1: ESPECIALIDAD */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Especialidad / Área:</label>
                            <select value={especialidadTemp} onChange={(e) => setEspecialidadTemp(e.target.value)} className="w-full border-2 border-gray-300 text-gray-800 text-base md:text-lg rounded-xl p-3" required>
                                <option value="" disabled>-- Seleccione su área --</option>
                                {CONSULTORIOS_DISPONIBLES.map(cons => <option key={cons} value={cons}>{cons}</option>)}
                            </select>
                        </div>

                        {/* INPUT 2: MÓDULO FÍSICO */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Puerta Física / Módulo:</label>
                            <select value={moduloTemp} onChange={(e) => setModuloTemp(e.target.value)} className="w-full border-2 border-gray-300 text-gray-800 text-base md:text-lg rounded-xl p-3" required>
                                <option value="" disabled>-- Seleccione su ubicación --</option>
                                {MODULOS_DISPONIBLES.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                            </select>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 text-white font-bold text-lg md:text-xl py-3 mt-4 rounded-xl hover:bg-blue-700 shadow-md transition-transform active:scale-95">Ingresar al Sistema</button>
                    </form>
                </div>
                <div className="mt-6 w-full max-w-lg">{monitorDeConexion}</div>
            </div>
        );
    }

    const pacientesEnEsperaParaMi = obtenerColaVirtual(getEspecialidadDestino());

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8 font-sans overflow-x-hidden">

            {/* CABECERA RESPONSIVA */}
            <header className={`mb-6 md:mb-8 text-white p-4 md:p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center transition-colors ${modoPruebaEsfuerzo ? 'bg-purple-900' : 'bg-blue-900'}`}>
                <div className="w-full flex justify-between items-start md:w-auto md:block">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black truncate pr-2">{getEspecialidadDestino()}</h1>
                        <p className="text-sm md:text-base font-medium text-blue-200 mt-1">📍 {miModulo}</p>
                    </div>
                    <button onClick={salirDelPanel} className="mt-1 md:mt-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 md:py-1 rounded transition-colors border border-white/20 whitespace-nowrap">
                        Cerrar Sesión
                    </button>
                </div>
                {monitorDeConexion}
            </header>

            {/* --- CONTROLES ESPECIALES DE ÁREA RESPONSIVOS --- */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
                {miEspecialidad === "RAYOS X (1er Piso)" && !pacienteActual && (
                    <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between sm:justify-start gap-4 transition-colors border-2 w-full sm:w-auto ${bloquearMujeresRayosX ? 'bg-pink-50 border-pink-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="text-center sm:text-left">
                            <p className={`font-bold text-base md:text-lg ${bloquearMujeresRayosX ? 'text-pink-800' : 'text-green-800'}`}>{bloquearMujeresRayosX ? 'Mujeres Bloqueadas' : 'Mujeres Permitidas'}</p>
                            <p className={`text-xs md:text-sm ${bloquearMujeresRayosX ? 'text-pink-600' : 'text-green-600'}`}>{bloquearMujeresRayosX ? 'Solo se llamarán hombres.' : 'Descarte OK.'}</p>
                        </div>
                        <button onClick={() => setBloquearMujeresRayosX(!bloquearMujeresRayosX)} className={`relative inline-flex h-8 w-16 md:h-10 md:w-20 items-center rounded-full transition-colors focus:outline-none shrink-0 ${bloquearMujeresRayosX ? 'bg-pink-500' : 'bg-green-500'}`}>
                            <span className={`inline-block h-6 w-6 md:h-8 md:w-8 transform rounded-full bg-white transition-transform ${bloquearMujeresRayosX ? 'translate-x-1' : 'translate-x-9 md:translate-x-11'}`} />
                        </button>
                    </div>
                )}

                {miEspecialidad === "CARDIOLOGIA (2do Piso)" && !pacienteActual && (
                    <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between sm:justify-start gap-4 md:gap-6 transition-colors border-2 shadow-sm w-full sm:w-auto ${modoPruebaEsfuerzo ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="text-center sm:text-left">
                            <p className={`font-black text-base md:text-lg ${modoPruebaEsfuerzo ? 'text-purple-800' : 'text-blue-800'}`}>MODO DE ATENCIÓN</p>
                            <p className={`text-xs md:text-sm font-medium ${modoPruebaEsfuerzo ? 'text-purple-600' : 'text-blue-600'}`}>{modoPruebaEsfuerzo ? 'Prueba de Esfuerzo' : 'Cardiología Normal'}</p>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-inner shrink-0">
                            <span className={`text-[10px] md:text-xs font-bold ${!modoPruebaEsfuerzo ? 'text-blue-600' : 'text-gray-400'}`}>CARDIO</span>
                            <button onClick={() => setModoPruebaEsfuerzo(!modoPruebaEsfuerzo)} className={`relative inline-flex h-7 w-14 md:h-8 md:w-16 items-center rounded-full transition-colors focus:outline-none ${modoPruebaEsfuerzo ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                <span className={`inline-block h-5 w-5 md:h-6 md:w-6 transform rounded-full bg-white transition-transform ${modoPruebaEsfuerzo ? 'translate-x-8 md:translate-x-9' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-[10px] md:text-xs font-bold ${modoPruebaEsfuerzo ? 'text-purple-600' : 'text-gray-400'}`}>ESFUERZO</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- SEMÁFORO PRINCIPAL RESPONSIVO --- */}
            <div className="max-w-4xl mx-auto mb-8 md:mb-12">
                {!pacienteActual ? (
                    <div className={`bg-white border-4 rounded-3xl p-6 md:p-10 text-center shadow-xl transform transition-all ${modoPruebaEsfuerzo ? 'border-purple-400' : 'border-green-400'}`}>
                        <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-inner ${modoPruebaEsfuerzo ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                            <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={modoPruebaEsfuerzo ? "M13 10V3L4 14h7v7l9-11h-7z" : "M5 13l4 4L19 7"}></path></svg>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 mb-2">Módulo Libre</h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-500 mb-6 md:mb-8">Hay <strong className={modoPruebaEsfuerzo ? "text-purple-600" : "text-green-600"}>{pacientesEnEsperaParaMi.length}</strong> pacientes esperando a {getEspecialidadDestino().split('(')[0].trim()}.</p>
                        <button
                            onClick={llamarSiguienteAutomatico}
                            className={`w-full px-4 py-4 md:px-12 md:py-5 rounded-2xl font-black text-lg sm:text-xl md:text-2xl shadow-lg transition-transform active:scale-95 ${pacientesEnEsperaParaMi.length > 0 ? (modoPruebaEsfuerzo ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse' : 'bg-green-500 hover:bg-green-600 text-white animate-pulse') : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            disabled={pacientesEnEsperaParaMi.length === 0}
                        >
                            LLAMAR SIGUIENTE
                        </button>
                    </div>
                ) : pacienteActual.estado === 'LLAMANDO' ? (
                    <div className="bg-white border-4 border-orange-400 rounded-3xl p-6 md:p-10 text-center shadow-xl transform transition-all">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-inner animate-bounce"><svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></div>
                        <h2 className="text-lg md:text-2xl font-bold text-gray-500 uppercase tracking-widest mb-2">Llamando por TV a:</h2>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-800 mb-2 leading-tight break-words">{pacienteActual.nombre_paciente}</h1>
                        <p className="text-sm md:text-lg font-bold text-orange-600 mb-6 md:mb-8 uppercase bg-orange-50 inline-block px-3 py-1 rounded-full border border-orange-200">Enviado a: {pacienteActual.consultorio_actual}</p>
                        <button onClick={() => cambiarEstadoPaciente(pacienteActual.id_mediweb, 'EN_ATENCION')} className="w-full px-4 py-4 md:px-12 md:py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg md:text-2xl shadow-lg transition-transform active:scale-95">INGRESÓ (INICIAR)</button>
                    </div>
                ) : (
                    <div className="bg-white border-4 border-red-500 rounded-3xl p-6 md:p-10 text-center shadow-xl transform transition-all">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-inner"><svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                        <h2 className="text-lg md:text-2xl font-bold text-gray-500 uppercase tracking-widest mb-2">Atendiendo a:</h2>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-800 mb-2 leading-tight break-words">{pacienteActual.nombre_paciente}</h1>
                        <p className="text-sm md:text-lg font-bold text-red-600 mb-6 md:mb-8 uppercase bg-red-50 inline-block px-3 py-1 rounded-full border border-red-200">Ubicación: {pacienteActual.consultorio_actual}</p>
                        <button onClick={() => cambiarEstadoPaciente(pacienteActual.id_mediweb, 'ESPERA')} className="w-full px-4 py-4 md:px-12 md:py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg md:text-2xl shadow-lg transition-transform active:scale-95">FINALIZAR CONSULTA</button>
                    </div>
                )}
            </div>

            {/* --- LISTA INFERIOR RESPONSIVA --- */}
            {pacientesEnEsperaParaMi.length > 0 && !pacienteActual && (
                <div className="pb-8">
                    <h3 className="text-lg md:text-xl font-bold text-gray-700 mb-3 md:mb-4 px-2">Próximos en cola:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 opacity-75 pointer-events-none">
                        {pacientesEnEsperaParaMi.slice(0, 8).map((paciente) => (
                            <div key={paciente.id_mediweb} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
                                <h4 className="font-bold text-gray-800 truncate text-sm md:text-base">{paciente.nombre_paciente}</h4>
                                <p className="text-xs text-gray-500 mt-1">Sexo: {paciente.sexo} • Edad: {paciente.edad}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}