import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TV() {
    const [pacienteLlamado, setPacienteLlamado] = useState(null);
    const [enEspera, setEnEspera] = useState([]);

    // Sonido de alerta (Ding-Dong)
    const reproducirTimbre = () => {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg'); // Puedes cambiar este link luego por un MP3 de tu clínica
        audio.play().catch(e => console.log("El navegador bloqueó el audio automático. Haz un clic en la pantalla de la TV para habilitarlo."));
    };

    useEffect(() => {
        // Cargar estado inicial
        const fetchDatos = async () => {
            const { data, error } = await supabase
                .from('turnos_activos')
                .select('*')
                .order('id_mediweb', { ascending: true });

            if (!error && data) {
                // Filtramos los que están esperando
                setEnEspera(data.filter(p => p.estado === 'ESPERA'));

                // Buscamos si hay alguien siendo llamado en este momento (tomamos el último actualizado)
                const llamados = data.filter(p => p.estado === 'LLAMANDO');
                if (llamados.length > 0) {
                    // Ordenamos para mostrar el más reciente (si tuvieras una columna 'updated_at', sería ideal usarla)
                    setPacienteLlamado(llamados[llamados.length - 1]);
                } else {
                    setPacienteLlamado(null);
                }
            }
        };

        fetchDatos();

        // ESCUCHAR CAMBIOS EN TIEMPO REAL (Velocidad de la luz)
        const subscription = supabase
            .channel('tv-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_activos' }, (payload) => {

                // Si el médico cambió el estado a LLAMANDO
                if (payload.new && payload.new.estado === 'LLAMANDO') {
                    setPacienteLlamado(payload.new);
                    reproducirTimbre();
                }
                // Si el médico lo marcó como ATENDIDO (volvió a espera o desapareció)
                else if (payload.new && payload.new.estado === 'ESPERA' && pacienteLlamado && payload.new.id === pacienteLlamado.id) {
                    setPacienteLlamado(null);
                }

                // Siempre refrescamos la lista entera para mantener la cola actualizada
                fetchDatos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [pacienteLlamado]);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row overflow-hidden font-sans">

            {/* SECCIÓN IZQUIERDA: Llamado Actual (Pantalla Principal) */}
            <div className="w-full md:w-2/3 bg-blue-900 text-white p-10 flex flex-col justify-center items-center relative shadow-2xl z-10">

                {/* Decoración de fondo */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                </div>

                <img
                    src="https://via.placeholder.com/200x80?text=Logo+Policlinico"
                    alt="Logo Divino Niño"
                    className="absolute top-8 left-8 h-16 bg-white/20 p-2 rounded-lg backdrop-blur-sm"
                />

                {pacienteLlamado ? (
                    <div className="text-center w-full animate-fade-in-up">
                        <h2 className="text-3xl md:text-5xl font-bold text-blue-200 uppercase tracking-widest mb-4">
                            Pase al Consultorio
                        </h2>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 my-8 shadow-2xl transform transition-all scale-105">
                            <h1 className="text-6xl md:text-8xl font-black text-white leading-tight mb-6 animate-pulse">
                                {pacienteLlamado.nombre_paciente}
                            </h1>
                            <div className="inline-block bg-orange-500 text-white text-4xl font-bold px-10 py-4 rounded-full shadow-lg">
                                {pacienteLlamado.consultorio_actual || "Consultorio Médico"}
                            </div>
                        </div>
                        <p className="text-2xl text-blue-200 mt-8">Por favor, acérquese con su DNI.</p>
                    </div>
                ) : (
                    <div className="text-center opacity-50">
                        <svg className="w-32 h-32 mx-auto mb-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <h1 className="text-5xl font-bold text-blue-100">Sala de Espera</h1>
                        <p className="text-2xl text-blue-300 mt-4">En breves momentos será llamado.</p>
                    </div>
                )}
            </div>

            {/* SECCIÓN DERECHA: Lista de Próximos (Sidebar) */}
            <div className="w-full md:w-1/3 bg-gray-800 flex flex-col">
                <div className="bg-gray-950 p-6 shadow-md z-20">
                    <h3 className="text-2xl font-bold text-green-400 flex items-center gap-3">
                        <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                        </span>
                        Próximos Turnos
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {enEspera.length === 0 ? (
                        <p className="text-gray-500 text-center mt-10 text-xl">No hay pacientes en cola</p>
                    ) : (
                        enEspera.map((p, index) => (
                            <div key={p.id} className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl p-4 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-800 text-gray-400 font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-100">{p.nombre_paciente}</h4>
                                        <p className="text-sm text-gray-400 truncate mt-1">
                                            Espera para: {typeof p.consultorios_pendientes === 'string' ? p.consultorios_pendientes.replace(/[{}""]/g, '') : "Exámenes"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}