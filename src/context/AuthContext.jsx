import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        // 1. Revisar si hay una sesión guardada en el navegador (al recargar la página)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) obtenerPerfil(session.user.id);
            else setCargandoAuth(false);
        });

        // 2. Escuchar cuando el usuario hace Login o Logout
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
        // Consultamos la tabla 'perfiles' que creaste en Supabase para saber su rol y área
        const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single();
        setPerfil(data);
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