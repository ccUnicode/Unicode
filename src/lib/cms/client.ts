import { supabase, supabaseAdmin } from '../supabase';
import type { CmsApiResponse } from '../../types/cms';
import { CMS_CACHE_HEADERS } from '../../types/cms';

/**
 * Cliente Supabase para operaciones administrativas y del CMS.
 * Utiliza SUPABASE_SERVICE_ROLE_KEY en el servidor para operaciones seguras
 * (auditoría, mutaciones validadas por middleware y gestión de permisos).
 * 
 * NUNCA debe exponerse al navegador.
 */
export function getCmsAdminClient() {
  return supabaseAdmin;
}

/**
 * Cliente Supabase público (Anon Key).
 * Respeta estrictamente las políticas RLS (Row Level Security) y se utiliza
 * para consultas públicas (ej. eventos con estado 'published').
 */
export function getCmsPublicClient() {
  return supabase;
}

/**
 * Construye una respuesta HTTP JSON estándar para endpoints del CMS.
 */
export function cmsResponse<T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>,
  meta?: CmsApiResponse<T>['meta']
): Response {
  const body: CmsApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...CMS_CACHE_HEADERS.ADMIN_PRIVATE,
    ...extraHeaders,
  });

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

/**
 * Construye una respuesta HTTP JSON de error estandarizada para endpoints del CMS.
 */
export function cmsError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  extraHeaders?: Record<string, string>
): Response {
  const body: CmsApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...CMS_CACHE_HEADERS.ADMIN_PRIVATE,
    ...extraHeaders,
  });

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
