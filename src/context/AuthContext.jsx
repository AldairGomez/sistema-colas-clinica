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
            alert("⚠️ Login exitoso, pero tu usuario no tiene un ROL asignado en la base de datos. El Administrador debe registrarte en la tabla 'perfiles'.");
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