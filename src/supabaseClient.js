import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Asegúrate de tener tus variables de entorno correctas
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Creamos un adaptador inteligente para guardar la sesión
const almacenamientoDinamico = {
    getItem: (key) => {
        // Busca la llave en cualquiera de los dos almacenamientos
        return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    },
    setItem: (key, value) => {
        // Si el usuario marcó el check, lo guardamos permanentemente. Si no, en la memoria volátil.
        if (window.localStorage.getItem('recordar_sesion') === 'true') {
            window.localStorage.setItem(key, value);
        } else {
            window.sessionStorage.setItem(key, value);
        }
    },
    removeItem: (key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
    }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: almacenamientoDinamico // Le inyectamos nuestro adaptador
    }
});