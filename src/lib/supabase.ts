import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente estándar para el frontend (usando Anon Key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrador para el backend (usando Service Role Key)
// ¡IMPORTANTE!: No usar este cliente en componentes del cliente (.astro fuera de la sección del script o componentes de React/Vue/etc)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

