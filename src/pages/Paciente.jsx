import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Paciente() {
    // Estados para manejar el flujo de la aplicación
    const [paso, setPaso] = useState('LOGIN'); // LOGIN | CONFIRMACION | ESTADO
    const [dniInput, setDniInput] = useState('');
    const [paciente, setPaciente] = useState(null);
    const [errorValidacion, setErrorValidacion] = useState('');

    // --- PASO 1: BUSCAR PACIENTE ---
    const buscarPaciente = async (e) => {
        e.preventDefault();
        setErrorValidacion('');

        if (!dniInput.trim() || dniInput.length < 8) {
            setErrorValidacion('Por favor, ingrese un DNI válido.');
            return;
        }

        // Buscamos al paciente en la base de datos
        const { data, error } = await supabase
            .from('turnos_activos')
            .select('*')
            .eq('dni', dniInput.trim())
            .order('id_mediweb', { ascending: false }) // Si hay duplicados, traemos el más reciente
            .limit(1);

        if (error || !data || data.length === 0) {
            setErrorValidacion('El paciente no existe o no está en el sistema actualmente.');
            setPaciente(null);
        } else {
            setPaciente(data[0]);
            setPaso('CONFIRMACION'); // Pasamos a la pantalla de confirmación
        }
    };

    // --- PASO 3: ESCUCHAR CAMBIOS EN VIVO ---
    // Una vez que el paciente confirma que es él, la app se queda escuchando a Supabase
    useEffect(() => {
        if (paso !== 'ESTADO' || !paciente) return;

        const subscription = supabase
            .channel(`paciente-${paciente.dni}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'turnos_activos', filter: `dni=eq.${paciente.dni}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        // Si lo borraron de la TV, lo sacamos de la app
                        setErrorValidacion('Tu turno ha finalizado o fuiste retirado del sistema.');
                        setPaso('LOGIN');
                        setDniInput('');
                    } else if (payload.new) {
                        // Si el médico lo llama o lo devuelve a espera, se actualiza al instante
                        setPaciente(payload.new);

                        // Si lo acaban de llamar, hacemos que el celular vibre (si el navegador lo permite)
                        if (payload.new.estado === 'LLAMANDO' && navigator.vibrate) {
                            navigator.vibrate([500, 200, 500]);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [paso, paciente]);

    // --- RENDERIZADO CONDICIONAL DE LAS PANTALLAS ---
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans selection:bg-green-200">

            {/* Contenedor tipo "Móvil" */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

                {/* Cabecera Corporativa */}
                <div className="bg-green-600 p-6 text-center text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <h1 className="text-2xl font-bold relative z-10">Policlínico Divino Niño</h1>
                    <p className="text-green-100 text-sm mt-1 relative z-10">Consulta tu turno en vivo</p>
                </div>

                <div className="p-8">

                    {/* PANTALLA 1: INGRESO DE DNI */}
                    {paso === 'LOGIN' && (
                        <div className="animate-fade-in-up">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                                Bienvenido
                            </h2>

                            <form onSubmit={buscarPaciente} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ingrese su DNI:
                                    </label>
                                    <input
                                        type="number"
                                        value={dniInput}
                                        onChange={(e) => setDniInput(e.target.value)}
                                        placeholder="Ej. 12345678"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-lg text-center font-bold tracking-widest"
                                        autoFocus
                                    />
                                </div>

                                {errorValidacion && (
                                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center border border-red-100 animate-pulse">
                                        ⚠️ {errorValidacion}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-green-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-green-700 active:transform active:scale-95 transition-all shadow-md"
                                >
                                    Aceptar
                                </button>
                            </form>
                        </div>
                    )}

                    {/* PANTALLA 2: CONFIRMACIÓN DE IDENTIDAD */}
                    {paso === 'CONFIRMACION' && paciente && (
                        <div className="text-center animate-fade-in-up">
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>

                            <p className="text-gray-500 mb-2">¿Es usted esta persona?</p>
                            <h2 className="text-2xl font-black text-gray-800 mb-8 leading-tight">
                                {paciente.nombre_paciente}
                            </h2>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setPaso('ESTADO')}
                                    className="w-full bg-blue-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                >
                                    Sí, soy yo (Ver mi turno)
                                </button>
                                <button
                                    onClick={() => {
                                        setPaso('LOGIN');
                                        setDniInput('');
                                    }}
                                    className="w-full bg-gray-100 text-gray-600 font-bold text-lg py-3 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
                                >
                                    No, corregir DNI
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PANTALLA 3: ESTADO EN VIVO (DASHBOARD DEL PACIENTE) */}
                    {paso === 'ESTADO' && paciente && (
                        <div className="animate-fade-in-up text-center">

                            {paciente.estado === 'LLAMANDO' ? (
                                // VISTA CUANDO ES SU TURNO
                                <div className="bg-orange-50 border-2 border-orange-400 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-pulse"></div>
                                    <h2 className="text-3xl font-black text-orange-600 mb-2 animate-bounce">
                                        ¡ES SU TURNO!
                                    </h2>
                                    <p className="text-gray-700 font-medium mb-6">Por favor, acérquese inmediatamente a:</p>
                                    <div className="bg-orange-500 text-white text-2xl font-bold py-4 px-6 rounded-xl shadow-inner mb-4">
                                        {paciente.consultorio_actual || "Consultorio Médico"}
                                    </div>
                                    <p className="text-sm text-orange-700 font-semibold">Tenga su DNI a la mano.</p>
                                </div>
                            ) : (
                                // VISTA CUANDO ESTÁ EN ESPERA
                                <div>
                                    <div className="bg-gray-100 inline-block px-4 py-1 rounded-full text-gray-500 text-sm font-bold tracking-wide mb-6">
                                        ESTADO: EN SALA DE ESPERA
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Hola,</h3>
                                    <h2 className="text-2xl font-black text-blue-900 mb-8 leading-tight">
                                        {paciente.nombre_paciente.split(' ')[0]} {/* Muestra solo el primer nombre para hacerlo amigable */}
                                    </h2>

                                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 text-left">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            Exámenes Pendientes ({typeof paciente.consultorios_pendientes === 'string' ? paciente.consultorios_pendientes.replace(/^{|}$/g, '').split(',').length : 0})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(typeof paciente.consultorios_pendientes === 'string'
                                                ? paciente.consultorios_pendientes.replace(/^{|}$/g, '').split(',')
                                                : paciente.consultorios_pendientes || []
                                            ).map((pendiente, index) => (
                                                <span key={index} className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-100">
                                                    {pendiente.replace(/"/g, '').trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                        Actualización automática activada
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}