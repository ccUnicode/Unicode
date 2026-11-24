/**
 * Clientes Supabase perezosos para el backend del CMS Unicode.
 * Evita instanciación en tiempo de importación durante `astro build` o tests sin .env.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CmsError } from './errors';

let serviceClient: SupabaseClient | undefined;
let anonClient: SupabaseClient | undefined;

function readEnv(name: string): string | undefined {
  return import.meta.env[name] || process.env[name];
}

function getSupabaseUrl(): string {
  const url = readEnv('PUBLIC_SUPABASE_URL') || readEnv('SUPABASE_URL');
  if (!url) {
    throw new CmsError(
      'setup_required',
      'Falta configurar PUBLIC_SUPABASE_URL en el servidor.',
      503,
    );
  }
  return url;
}

export function getCmsServiceClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    throw new CmsError(
      'setup_required',
      'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.',
      503,
    );
  }
  serviceClient ||= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

export function getCmsAnonClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = readEnv('PUBLIC_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY');
  if (!anonKey) {
    throw new CmsError(
      'setup_required',
      'Falta configurar PUBLIC_SUPABASE_ANON_KEY en el servidor.',
      503,
    );
  }
  anonClient ||= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}
