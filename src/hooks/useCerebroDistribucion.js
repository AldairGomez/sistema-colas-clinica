import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useCerebroDistribucion(miEspecialidad, miModulo) {
    const [pacientes, setPacientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [consultoriosActivos, setConsultoriosActivos] = useState([]);

    // Estados de control que el Panel usará
    const [bloquearMujeresRayosX, setBloquearMujeresRayosX] = useState(true);
    const [modoPruebaEsfuerzo, setModoPruebaEsfuerzo] = useState(false);

    // 1. OBTENER PACIENTES (Filtro por día actual)
    useEffect(() => {
        const fetchPacientes = async () => {
            const inicioDelDia = new Date();
            inicioDelDia.setHours(0, 0, 0, 0);
            const finDelDia = new Date();
            finDelDia.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('turnos_activos')
                .select('*')
                .gte('ultima_actualizacion', inicioDelDia.toISOString())
                .lte('ultima_actualizacion', finDelDia.toISOString())
                .order('id_mediweb', { ascending: true });

            if (!error) setPacientes(data || []);
            setCargando(false);
        };

        fetchPacientes();

        const turnosChannel = supabase
            .channel('tabla-turnos-panel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_activos' }, fetchPacientes)
            .subscribe();

        return () => supabase.removeChannel(turnosChannel);
    }, []);

    // 2. RADAR DE PRESENCIA
    useEffect(() => {
        const presenceChannel = supabase.channel('room-presence', {
            config: { presence: { key: miEspecialidad ? `${miEspecialidad}-${miModulo}` : 'portal' } },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const activos = [];
                for (const key in state) {
                    state[key].forEach(presence => {
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

    // 3. UTILIDADES DE LÓGICA DE NEGOCIO
    const getEspecialidadDestino = () => {
        if (miEspecialidad === "CARDIOLOGIA (2do Piso)" && modoPruebaEsfuerzo) return "PRUEBA DE ESFUERZO (2do Piso)";
        return miEspecialidad;
    };

    const getTextoParaTV = (destinoOverride = null) => {
        const area = destinoOverride || getEspecialidadDestino();
        const nombreAreaLimpia = area.split('(')[0].trim();
        return `${nombreAreaLimpia} - ${miModulo}`;
    };

    const getPendientesReales = (paciente) => {
        const pendsMediWeb = typeof paciente.consultorios_pendientes === 'string'
            ? paciente.consultorios_pendientes.replace(/^{|}$/g, '').split(',').map(x => x.replace(/"/g, '').trim())
            : paciente.consultorios_pendientes || [];
        const yaAtendidos = typeof paciente.consultorios_atendidos === 'string'
            ? paciente.consultorios_atendidos.split(',').map(x => x.trim())
            : [];
        return pendsMediWeb.filter(area => area && !yaAtendidos.includes(area));
    };

    const cambiarEstadoPaciente = async (pacienteTarget, nuevoEstado, destinoOverride = null) => {
        let consultorioUpdate = null;
        let atendidosUpdate = pacienteTarget.consultorios_atendidos || '';

        if (nuevoEstado !== 'ESPERA') {
            consultorioUpdate = getTextoParaTV(destinoOverride);
        } else {
            const areaTerminada = getEspecialidadDestino();
            const yaAtendidos = atendidosUpdate.split(',').map(x => x.trim());
            if (!yaAtendidos.includes(areaTerminada)) {
                atendidosUpdate = atendidosUpdate ? `${atendidosUpdate},${areaTerminada}` : areaTerminada;
            }
        }

        await supabase.from('turnos_activos').update({
            estado: nuevoEstado,
            consultorio_actual: consultorioUpdate,
            consultorios_atendidos: atendidosUpdate
        }).eq('id_mediweb', pacienteTarget.id_mediweb);
    };

    const obtenerColaVirtual = (area) => {
        return pacientes.filter(p => {
            if (p.estado !== 'ESPERA') return false;
            const pendientesReales = getPendientesReales(p);
            if (pendientesReales.includes("LABORATORIO (1er Piso)") && area !== "LABORATORIO (1er Piso)") return false;
            return pendientesReales.includes(area);
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
            const pendientesReales = getPendientesReales(p);

            if (miDestinoVirtual === "RAYOS X (1er Piso)" && (sexo === 'F' || sexo === 'FEMENINO') && bloquearMujeresRayosX) continue;
            if (miDestinoVirtual === "ESPIROMETRIA (2do Piso)" && edadNum > 40 && pendientesReales.includes("AUDIOMETRIA (2do Piso)")) continue;
            if (miDestinoVirtual === "PSICOSENSOMETRICO (1er Piso)" && pendientesReales.includes("OFTALMOLOGIA (2do Piso)")) continue;
            if (miDestinoVirtual === "PSICOLOGIA (1er Piso)" && pendientesReales.includes("PSICOSENSOMETRICO (1er Piso)")) continue;

            const requiereTriaje = pendientesReales.includes("TRIAJE (1er Piso)");
            if (requiereTriaje && miDestinoVirtual !== "TRIAJE (1er Piso)") {
                if (miDestinoVirtual === "RAYOS X (1er Piso)") {
                    if (consultoriosActivos.includes("TRIAJE (1er Piso)") && obtenerColaVirtual("TRIAJE (1er Piso)").length < 3) continue;
                } else {
                    continue;
                }
            }
            candidatosValidos.push(p);
        }

        if (candidatosValidos.length === 0) {
            alert("Los pacientes en su lista están retenidos por embudos o reglas médicas.");
            return;
        }

        let pacienteElegido = null;
        for (let p of candidatosValidos) {
            let esElSiguiente = false;
            const pendientesReales = getPendientesReales(p);
            for (let otraArea of pendientesReales) {
                if (otraArea !== miDestinoVirtual && consultoriosActivos.includes(otraArea)) {
                    const colaOtraArea = obtenerColaVirtual(otraArea);
                    if (colaOtraArea.length > 0 && colaOtraArea[0].id_mediweb === p.id_mediweb) {
                        esElSiguiente = true; break;
                    }
                }
            }
            if (!esElSiguiente) { pacienteElegido = p; break; }
        }

        if (!pacienteElegido) pacienteElegido = candidatosValidos[0];
        cambiarEstadoPaciente(pacienteElegido, 'LLAMANDO', miDestinoVirtual);
    };

    const pacientesActuales = pacientes.filter(p => {
        if (!['LLAMANDO', 'EN_ATENCION', 'EN_ENTREVISTA'].includes(p.estado)) return false;

        const tvCardio = getTextoParaTV("CARDIOLOGIA (2do Piso)");
        const tvEsfuerzo = getTextoParaTV("PRUEBA DE ESFUERZO (2do Piso)");
        const tvNormal = getTextoParaTV(miEspecialidad);

        if (miEspecialidad === "CARDIOLOGIA (2do Piso)") {
            return p.consultorio_actual === tvCardio || p.consultorio_actual === tvEsfuerzo;
        }

        return p.consultorio_actual === tvNormal;
    });

    // Definir pacientesEnEsperaParaMi para el Panel
    const pacientesEnEsperaParaMi = miEspecialidad ? obtenerColaVirtual(getEspecialidadDestino()) : [];

    // 4. RETORNAR TODO LO QUE LA UI NECESITA
    return {
        cargando,
        consultoriosActivos,
        pacientesActuales,
        pacientesEnEsperaParaMi,
        getEspecialidadDestino,
        cambiarEstadoPaciente,
        llamarSiguienteAutomatico,
        bloquearMujeresRayosX, setBloquearMujeresRayosX,
        modoPruebaEsfuerzo, setModoPruebaEsfuerzo
    };
}