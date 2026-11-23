import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  'https://mock-project.supabase.co';
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  'mock-anon-key';
const supabaseServiceKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Standard client for frontend (using Anon Key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend (using Service Role Key)
// IMPORTANT: Do not use this client in client-side components (.astro outside script section, or React/Vue components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

