// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Reemplaza esto con la URL y la Key de tu proyecto en Supabase
const supabaseUrl = 'https://immlqldjdrgaituledea.supabase.co'
const supabaseAnonKey = 'sb_publishable_paYTh9a44vOiOYcWaVdXcA_cn0PBWUl' // Usa la anon/public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)