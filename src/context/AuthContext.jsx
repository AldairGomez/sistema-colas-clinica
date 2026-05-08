import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) obtenerPerfil(session.user.id);
            else setCargandoAuth(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) obtenerPerfil(session.user.id);
            else {
                setPerfil(null);
                setCargandoAuth(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const obtenerPerfil = async (userId) => {
        const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).single();

        // --- EL ESCUDO ANTI-PANTALLA CONGELADA ---
        if (error || !data) {
            console.error("Error al obtener perfil en Supabase:", error);
            
            const mensajeErrorBD = error ? `\nError DB: ${error.message} (Código: ${error.code})` : '\nError DB: No se encontró el registro (0 filas devueltas).';
            
            alert(`⚠️ Login exitoso, pero ocurrió un problema al leer tu perfil.\n${mensajeErrorBD}\n\n1. Tu ID de autenticación es:\n${userId}\n\n2. Revisa que el script de INSERT realmente se haya ejecutado con éxito en el SQL Editor de Supabase y que los datos existan en la tabla 'perfiles'.\n\n3. Revisa si por error insertaste el mismo usuario 2 veces (la función .single() falla si hay duplicados).`);
            
            await supabase.auth.signOut();
            setSession(null);
            setPerfil(null);
        } else {
            setPerfil(data);
        }
        setCargandoAuth(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, perfil, cargandoAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);