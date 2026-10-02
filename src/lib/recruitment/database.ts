import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { RecruitmentError } from './validation';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
// RPC-only database contract. Browser clients have no recruitment table permissions.
interface RecruitmentDatabase {
  public: { Tables: Record<never, never>; Views: Record<never, never>; Enums: Record<never, never>; CompositeTypes: Record<never, never>;
    Functions: { [key: string]: { Args: Record<string, Json | undefined>; Returns: Json } } };
}
const env = (name: string): string | undefined => import.meta.env[name] || process.env[name];
let client: SupabaseClient<RecruitmentDatabase> | undefined;
export function localDevelopmentDatabase(): boolean { return import.meta.env.DEV && Boolean(env('RECRUITMENT_LOCAL_DB_PATH')); }
export function databaseConfigured(): boolean { return localDevelopmentDatabase() || Boolean(env('PUBLIC_SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY')); }

const statuses: Record<string, number> = {
  unauthorized: 401, not_found: 404, duplicate: 409, capacity: 409, revision_conflict: 409,
  immutable: 409, invalid_transition: 409, attempts_exhausted: 409, upload_pending: 409, upload_in_progress: 409,
  call_closed: 403, call_not_started: 403, call_expired: 403, rate_limited: 429,
  alternate_not_allowed: 403, recording_required: 409, upload_expired: 409, upload_not_found: 404,
  configuration: 400, invalid_video: 400, incomplete: 400, availability: 400, invalid_area: 400,
  invalid_template: 400, reason_required: 400, invalid_delivery: 500, lease_lost: 409,
};
export async function recruitmentRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!/^recruitment_[a-z_]+$/.test(name)) throw new RecruitmentError('internal', 'Operación no permitida.', 500);
  let data: unknown; let error: { message: string; code?: string } | null;
  if (localDevelopmentDatabase()) {
    const { localRpc } = await import('../recruitment-local-db');
    ({ data, error } = await localRpc<T>(name, args));
  } else {
    const url = env('PUBLIC_SUPABASE_URL'); const key = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new RecruitmentError('setup_required', 'La convocatoria aún está pendiente de conexión a su base de datos.', 503);
    client ||= createClient<RecruitmentDatabase>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const response = await client.rpc(name, args as Record<string, Json>);
    data = response.data; error = response.error;
  }
  if (error) {
    const separator = error.message.indexOf(': '); const code = separator > 0 ? error.message.slice(0, separator) : '';
    if (Object.hasOwn(statuses, code)) throw new RecruitmentError(code, error.message.slice(separator + 2), statuses[code]);
    // Never return SQL internals, table names, keys, or connection details to callers.
    throw new RecruitmentError('database_error', 'No se pudo completar la operación en la base de datos.', 503);
  }
  return data as T;
}
