import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [recordarSesion, setRecordarSesion] = useState(false);
    const [cargando, setCargando] = useState(false);

    const { session, cargandoAuth } = useAuth(); // <-- Extraemos cargandoAuth
    const navigate = useNavigate();

    useEffect(() => {
        if (session) navigate('/inicio');
    }, [session, navigate]);

    // --- ESCUDO: Evita que el login "parpadee" si ya hay sesión ---
    if (cargandoAuth) {
        return (
            <div className="min-h-screen bg-blue-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-white text-xl font-bold animate-pulse">Recuperando sesión...</h2>
                </div>
            </div>
        );
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);

        // --- LA LLAVE DE PERSISTENCIA ---
        // Esto le dice a supabaseClient.js que use localStorage
        if (recordarSesion) {
            window.localStorage.setItem('recordar_sesion', 'true');
        } else {
            window.localStorage.removeItem('recordar_sesion');
        }

        let emailParaAuth = email;

        // Lógica híbrida: Usuario o Correo
        if (!email.includes('@')) {
            const { data: perfilEncontrado, error } = await supabase
                .from('perfiles')
                .select('correo')
                .eq('usuario', email)
                .single();

            if (error || !perfilEncontrado) {
                alert("El nombre de usuario no existe en la clínica.");
                setCargando(false);
                return;
            }
            emailParaAuth = perfilEncontrado.correo;
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: emailParaAuth,
            password
        });

        if (authError) {
            alert("Credenciales incorrectas. Verifica tu usuario/correo y contraseña.");
        }
        setCargando(false);
    };

    return (
        <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h1 className="text-3xl font-black text-center text-gray-800 mb-2 text-wrap">Policlínico Divino Niño</h1>
                <p className="text-center text-gray-500 mb-8 font-medium">Portal Seguro de Especialistas</p>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Usuario o Correo</label>
                        <input
                            type="text"
                            placeholder="ej. dr.perez"
                            className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                            value={email}
                            onChange={e => setEmail(e.target.value.trim().toLowerCase())}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center mt-2">
                        <input
                            type="checkbox"
                            id="recordar"
                            checked={recordarSesion}
                            onChange={(e) => setRecordarSesion(e.target.checked)}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <label htmlFor="recordar" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                            Mantener mi sesión iniciada
                        </label>
                    </div>

                    <button type="submit" disabled={cargando} className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-transform active:scale-95 disabled:opacity-70 mt-4">
                        {cargando ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}